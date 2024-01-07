import { writeFile } from "fs/promises";
import { createOSMStream } from "osm-pbf-parser-node";
import { deflate } from "pako";
import { fileURLToPath } from "url";

export interface ExtractionResult {
    relations: Map<number, Relation>;
    ways: Map<number, Way>;
    nodes: Map<number, Node>;
}

export interface ExtractionFilter {
    relations?: number[];
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

    public async fileTransform(filter?: ExtractionFilter): Promise<void> {
        const { routes, sections } = await this.getTransformed(filter);

        await Promise.all([
            this.zipAndWrite(routes, "routes"),
            this.zipAndWrite(sections, "sections")
        ]);
    }

    public async getTransformed(filter?: ExtractionFilter): Promise<{ routes: string; sections: string }> {
        const { relations, ways, nodes } = await this.extract(filter);
        return this.generateOutput(relations, ways, nodes);
    }

    public async extract(filter?: ExtractionFilter): Promise<ExtractionResult> {
        const relations = await this.getRelations(filter?.relations);
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

    private async zipAndWrite(data: string, dataName: string): Promise<void> {
        const zippedSections = deflate(data);
        await Promise.all([
            writeFile(`../location-analyzer/features/data/${dataName}.csv.zlib`, zippedSections),
            writeFile(`../raw/no-git/${dataName}.csv`, data)
        ]);
    }

    private generateOutput(relations: Map<number, Relation>, ways: Map<number, Way>, nodes: Map<number, Node>): { routes: string; sections: string } {
        const routes = this.getRouteOutput(relations);
        const sections = this.getSectionsOutput(relations, ways, nodes);
        return { routes, sections };
    }

    private getSectionsOutput(relations: Map<number, Relation>, ways: Map<number, Way>, nodes: Map<number, Node>): string {
        const header = "route_id,sequence_number,lat,lon";
        const sections = Array.from(relations.values()).map(relation => {
            const transformer = new SingleRouteTransformer(relation, ways, nodes);
            return transformer.getSectionsOutput();
        });
        return [header, ...sections].join("\n") + "\n";
    }

    private getRouteOutput(relations: Map<number, Relation>): string {
        const header = "id,from,to,ref";
        const output = Array.from(relations.values()).map(relation => {
            const routeId = relation.id;
            const routeRef = relation.tags.ref ?? "";
            const routeFrom = relation.tags.from ?? "";
            const routeTo = relation.tags.to ?? "";
            return `${routeId}, ${routeFrom}, ${routeTo}, ${routeRef}`;
        });
        return [header, ...output].join("\n") + "\n";
    }
}

class SingleRouteTransformer {
    private output = "";

    public constructor(
        private readonly relation: Relation,
        private readonly ways: Map<number, Way>,
        private readonly nodes: Map<number, Node>
    ) { }

    public getSectionsOutput(): string {
        const routeId = this.relation.id;
        let sequenceNumber = 0;
        let remainingWays = this.getWaysInRelation();

        const firstWay = remainingWays.shift();
        if (!firstWay) throw new Error(`Relation ${this.relation.tags.name} has no ways`);

        const firstWayStartNodeId = firstWay.refs?.[0];
        if (!firstWayStartNodeId) {
            throw new Error(`No start Node`);
        }

        const startNodeMatch = remainingWays.find(way => way.refs?.includes(firstWayStartNodeId));
        const endNodeMatch = remainingWays.find(way => way.refs?.includes(firstWay.refs?.[firstWay.refs.length - 1] ?? -1));

        if (startNodeMatch && !endNodeMatch) {
            // no nodes connect to the end of the first way, so we need to reverse it
            firstWay.refs = firstWay.refs?.reverse();
        }

        sequenceNumber = this.appendOutputForNodesWithIds(firstWay.refs ?? [], routeId, sequenceNumber);

        let lastNodeId = firstWay.refs?.[firstWay.refs.length - 1];
        while (lastNodeId !== undefined) {
            const currentNodeId = lastNodeId;
            const next = remainingWays.find(way => way.refs?.includes(currentNodeId));

            if (!next) {
                break;
            }

            let wayNodeIds = next.refs;
            if (!wayNodeIds) {
                console.warn(`${this.relation.tags.name}(${this.relation.id}) Way ${lastNodeId} connects to empty way ${next.id}`);
                return "";
            }

            if (wayNodeIds[wayNodeIds.length - 1] === currentNodeId) {
                // way end connects to last way
                wayNodeIds = wayNodeIds.reverse();
            } else if (wayNodeIds[0] !== currentNodeId) {
                console.warn(`${this.relation.tags.name}(${this.relation.id}) Way ${next.id} does contain node ${currentNodeId} of previous way, but at neither end nor start`);
                return "";
            }
            lastNodeId = wayNodeIds[wayNodeIds.length - 1];
            remainingWays = remainingWays.filter(way => way.id !== next.id);

            sequenceNumber = this.appendOutputForNodesWithIds(wayNodeIds, routeId, sequenceNumber);
        }

        if (remainingWays.length > 0) {
            if (remainingWays.length > 10) {
                console.warn(`${this.relation.tags.name}(${this.relation.id}) has ${remainingWays.length} ways left over.`);
            } else {
                console.log(`${this.relation.tags.name}(${this.relation.id}) has ${remainingWays.length} ways left over: ${remainingWays.map(way => way.id).join(", ")}`);
            }
        }

        return this.output;
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

    private appendOutputForNodesWithIds(wayNodeIds: number[], routeId: number, sequenceNumber: number): number {
        const wayNodes = wayNodeIds.map(nodeId => this.nodes.get(nodeId));
        wayNodes.forEach(node => {
            if (!node) throw new Error(`Node ${node} not found`);
            this.output += `${routeId}, ${sequenceNumber}, ${node.lat}, ${node.lon}\n`;
            sequenceNumber++;
        });
        return sequenceNumber;
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

interface Node {
    type: "node";
    id: number;
    lat: number;
    lon: number;
    tags: Record<string, string>;
}

interface Way {
    type: "way";
    id: number;
    refs?: number[];
    tags?: Record<string, string>;
}

interface Relation {
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
        extractor.fileTransform().then(() => console.log("Done")).catch(console.error);
    }
}
