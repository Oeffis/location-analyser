import { writeFile } from "fs/promises";
import { createOSMStream } from "osm-pbf-parser-node";
import { deflate } from "pako";
import { fileURLToPath } from "url";

export interface ExtractionResult {
    relations: Map<number, Relation>;
    ways: Map<number, Way>;
    nodes: Map<number, Node>;
}

export interface RouteFilter {
    routes?: number[];
}

interface StreamFilter<C extends OSMType> {
    typeGuard: (item: OSMType) => item is C;
    filter: (item: C) => boolean;
    onMatch: (item: C) => void;
}

export class OsmExtractor {
    private readonly routeTypes = [
        "bus",
        "trolleybus",
        "minibus",
        "share_taxi",
        "train",
        "light_rail",
        "subway",
        "tram",
        "monorail",
        "ferry",
        "funicular"
    ];

    public async extract(filter?: RouteFilter): Promise<ExtractionResult> {
        const relations = await this.getRelations(filter?.routes);
        const wayIdsToKeep = this.getWayIds(relations);
        const ways = await this.getWays(wayIdsToKeep);
        const nodeIdsToKeep = this.getNodeIds(ways);
        const nodes = await this.getNodes(nodeIdsToKeep);
        console.log("Done filtering, checking if we have everything");

        this.verifyWayCompleteness(wayIdsToKeep, ways);
        this.verifyNodeCompleteness(nodeIdsToKeep, nodes);
        console.log(`All ${nodes.size} node found in ${ways.size} ways for ${relations.size} routes.`);

        return {
            relations,
            ways,
            nodes
        };
    }

    private async getRelations(relationIds?: number[]): Promise<Map<number, Relation>> {
        const relations = new Map<number, Relation>();

        const baseFilter = (relation: Relation): boolean =>
            relation.tags.type === "route"
            && this.routeTypes.includes(relation.tags.route ?? "");
        let filter = baseFilter;

        if (relationIds) {
            const relationIdsToKeep = new Set(relationIds);
            filter = relation =>
                relationIdsToKeep.has(relation.id)
                && baseFilter(relation);
        }

        await this.filterStream({
            typeGuard: isRelation,
            filter,
            onMatch: relation => void relations.set(relation.id, relation)
        });

        return relations;
    }

    private getWayIds(relations: Map<number, Relation>): Set<number> {
        const wayIds = new Set<number>();
        relations.forEach(relation => {
            const ways = relation
                .members
                .filter(
                    member => member.type === "way"
                        && member.role === ""
                )
                .map(member => member.ref);
            ways.forEach(way => wayIds.add(way));
        });
        return wayIds;
    }

    private async getWays(wayIdsToKeep: Set<number>): Promise<Map<number, Way>> {
        const ways = new Map<number, Way>();

        await this.filterStream({
            typeGuard: isWay,
            filter: way => wayIdsToKeep.has(way.id),
            onMatch: way => void ways.set(way.id, way)
        });

        return ways;
    }

    private getNodeIds(ways: Map<number, Way>): Set<number> {
        const nodesToKeep = new Set<number>();
        ways.forEach(way => way.refs?.forEach(node => nodesToKeep.add(node)));
        return nodesToKeep;
    }

    private async getNodes(nodeIdsToKeep: Set<number>): Promise<Map<number, Node>> {
        const nodes = new Map<number, Node>();

        await this.filterStream({
            typeGuard: isNode,
            filter: node => nodeIdsToKeep.has(node.id),
            onMatch: node => void nodes.set(node.id, node)
        });

        return nodes;
    }

    private async filterStream<C extends OSMType>({ typeGuard: typeFilter, filter: filterFunction, onMatch: doFunction }: StreamFilter<C>): Promise<void> {
        const stream = this.createStream();
        for await (const item of stream) {
            if (!typeFilter(item)) continue;
            if (!filterFunction(item)) continue;
            doFunction(item);
        }
    }

    private createStream(): AsyncGenerator<OSMType, void> {
        return createOSMStream("../raw/no-git/Bochum.osm.pbf") as AsyncGenerator<OSMType, void>;
    }

    private verifyWayCompleteness(wayIdsToKeep: Set<number>, ways: Map<number, Way>): void {
        const missing = [...wayIdsToKeep].filter(id => !ways.has(id));
        if (missing.length > 0) {
            throw new Error(`Missing ${missing.length} ways: ${missing.join(", ")}`);
        }
    }

    private verifyNodeCompleteness(nodeIdsToKeep: Set<number>, nodes: Map<number, Node>): void {
        const missing = [...nodeIdsToKeep].filter(id => !nodes.has(id));
        const areMissing = missing.length > 0;
        if (areMissing) {
            throw new Error(`Missing ${missing.length} nodes: ${missing.join(", ")}`);
        }
    }
}

export class OsmTransformer {
    private readonly relations: Map<number, Relation>;
    private readonly ways: Map<number, Way>;
    private readonly nodes: Map<number, Node>;

    public constructor(
        extraction: ExtractionResult
    ) {
        this.relations = extraction.relations;
        this.ways = extraction.ways;
        this.nodes = extraction.nodes;
    }

    public async writeToFile(): Promise<void> {
        const { routes, sections } = this.getTransformed();

        await Promise.all([
            this.zipAndWrite(routes, "routes"),
            this.zipAndWrite(sections, "sections")
        ]);
    }

    public getTransformed(filter?: RouteFilter): { routes: string; sections: string } {
        const routes = this.getTransformedRoutes(filter);
        const sections = this.getTransformedSections(filter);
        return { routes, sections };
    }

    public getTransformedRoutes(filter?: RouteFilter): string {
        const header = "id,from,to,ref";
        const output = Array.from(this.relations.values())
            .filter(relation => !filter?.routes || filter.routes.includes(relation.id))
            .map(relation => {
                const routeId = relation.id;
                const routeRef = relation.tags.ref ?? "";
                const routeFrom = relation.tags.from ?? "";
                const routeTo = relation.tags.to ?? "";
                return `${routeId}, ${routeFrom}, ${routeTo}, ${routeRef}`;
            });
        return [header, ...output].join("\n") + "\n";
    }

    private getTransformedSections(filter?: RouteFilter): string {
        const header = "route_id,consecutive_section,sequence_number,lat,lon";
        const relationsAsArray = Array.from(this.relations.values())
            .filter(relation => !filter?.routes || filter.routes.includes(relation.id));
        const sections = relationsAsArray.flatMap(relation =>
            new RouteSorter(relation, this.ways)
                .getConsecutiveSections()
                .flatMap((cSection, cSectionIndex) =>
                    cSection
                        .map(nodeId => this.getNodeOrThrow(nodeId))
                        .map((node, sectionIndex) => `${relation.id}, ${cSectionIndex}, ${sectionIndex}, ${node.lat}, ${node.lon}`)
                )
        );
        return [header, ...sections].join("\n") + "\n";
    }

    private getNodeOrThrow(nodeId: number): Node {
        const node = this.nodes.get(nodeId);
        if (!node) throw new Error(`Node ${nodeId} not found`);
        return node;
    }

    private async zipAndWrite(data: string, dataName: string): Promise<void> {
        const zippedSections = deflate(data);
        await Promise.all([
            writeFile(`../location-analyzer/features/data/${dataName}.csv.zlib`, zippedSections),
            writeFile(`../raw/no-git/${dataName}.csv`, data)
        ]);
    }
}

class RouteSorter {
    private remainingWays: Way[];

    public constructor(
        private readonly relation: Relation,
        private readonly ways: Map<number, Way>
    ) {
        this.remainingWays = this.getWaysInRelation();
    }

    private getWaysInRelation(): Way[] {
        const waysInRelation = this.relation
            .members
            .filter(member => member.type === "way" && member.role === "")
            .map(member => member.ref)
            .map(wayId => this.ways.get(wayId));

        if (waysInRelation.some(way => !way))
            throw new Error(`Relation ${this.relation.tags.name} has missing ways`);

        return waysInRelation as Way[];
    }

    public getConsecutiveSections(): number[][] {
        const consecutiveSections = [];

        for (
            let startNodeId = this.getStartNodeIdOfConsecutiveSection();
            startNodeId !== undefined;
            startNodeId = this.getStartNodeIdOfConsecutiveSection()
        ) {
            consecutiveSections.push([startNodeId, ...this.getNodesFollowing(startNodeId)]);
        }

        if (consecutiveSections.length === 0) {
            console.warn(`Relation ${this.relation.tags.name}(${this.relation.id}) has not a single section`);
        }

        return consecutiveSections;
    }

    private getStartNodeIdOfConsecutiveSection(): number | undefined {
        while (this.remainingWays.length > 0) {
            const startNodeId = this.getStartNodeIdOrUndefined();
            if (startNodeId !== undefined) return startNodeId;
            console.warn(`Relation ${this.relation.tags.name} has a way that is not connected to any other way`);
            this.remainingWays.shift();
        }
    }

    private getStartNodeIdOrUndefined(): number | undefined {
        try {
            return this.getStartNodeIdOrThrow();
        } catch (e) {
            return undefined;
        }
    }

    private getStartNodeIdOrThrow(): number {
        const firstWay = this.remainingWays[0];
        if (!firstWay) throw new Error(`Relation ${this.relation.tags.name} has no ways`);

        const startNodeId = firstWay.refs?.[0];
        const endNodeId = firstWay.refs?.[firstWay.refs.length - 1];
        if (!startNodeId) throw new Error(`No start Node`);
        if (!endNodeId) throw new Error(`No end Node`);

        const nonFirstWays = this.remainingWays.slice(1);
        const startFoundInOthers = nonFirstWays.find(way => way.refs?.includes(startNodeId));
        const endFoundInOthers = nonFirstWays.find(way => way.refs?.includes(endNodeId));

        const endIsStart = startFoundInOthers && !endFoundInOthers;
        if (!endFoundInOthers && !startFoundInOthers) throw new Error(`Start node ${startNodeId} not found in any other way`);
        return endIsStart ? endNodeId : startNodeId;
    }

    private getNodesFollowing(startNodeId: number): number[] {
        const nodeIds = [];

        let currentWay = this.findWayIntersecting([startNodeId]);
        while (currentWay !== undefined) {
            this.removeFromRemaining(currentWay);
            const nodes = currentWay.refs ?? [];
            const nextWay = this.findWayIntersecting(nodes);
            if (nextWay) {
                const startNodeIndex = nodes.indexOf(startNodeId);
                const commonNodeIdIndex = nodes.findIndex(nodeId => nextWay.refs?.includes(nodeId));

                let wayNodeIds: number[];
                if (commonNodeIdIndex >= startNodeIndex) {
                    wayNodeIds = nodes.slice(startNodeIndex, commonNodeIdIndex + 1);
                } else {
                    wayNodeIds = nodes.slice(commonNodeIdIndex, startNodeIndex + 1).reverse();
                }

                const nodesToPrint = wayNodeIds.slice(1);
                nodeIds.push(...nodesToPrint);
                startNodeId = nodesToPrint[nodesToPrint.length - 1] ?? -1;
            } else {
                if (nodes[0] === startNodeId) {
                    nodeIds.push(...nodes.slice(1));
                } else {
                    nodeIds.push(...nodes.slice(0, -1).reverse());
                }
            }

            currentWay = nextWay;
        }

        return nodeIds;
    }

    private removeFromRemaining(way: Way): void {
        this.remainingWays = this.remainingWays.filter(remainingWay => remainingWay.id !== way.id);
    }

    private findWayIntersecting(nodeIds: number[]): Way | undefined {
        return this.remainingWays.find(way => nodeIds.some(nodeId => way.refs?.includes(nodeId)));
    }
}

function isNode(item: OSMType): item is Node {
    return (item as OSMNonRootType).type === "node";
}

function isWay(item: OSMType): item is Way {
    return (item as OSMNonRootType).type === "way";
}

function isRelation(item: OSMType): item is Relation {
    return (item as OSMNonRootType).type === "relation";
}

type OSMType = Root | OSMNonRootType;
type OSMNonRootType = Node | Way | Relation;

interface Root {
    source: string;
}

export interface Node {
    type: "node";
    id: number;
    lat: number;
    lon: number;
    tags: Record<string, string>;
}

export interface Way {
    type: "way";
    id: number;
    refs?: number[];
    tags?: Record<string, string>;
}

export interface Relation {
    type: "relation";
    id: number;
    members: {
        type: "node" | "way" | "relation";
        ref: number;
        role: string;
    }[];
    tags: Record<string, string>;
}
if (import.meta.url.startsWith("file:")) {
    const modulePath = fileURLToPath(import.meta.url);
    if (process.argv[1] === modulePath || (process.argv[1] + ".ts") === modulePath) {
        console.log("Extracting OSM data");
        const extractor = new OsmExtractor();
        extractor.extract().then(result => {
            const transformer = new OsmTransformer(result);
            return transformer.writeToFile();
        }).then(() => console.log("Done")).catch(console.error);
    }
}
