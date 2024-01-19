import { writeFile } from "fs/promises";
import { deflate } from "pako";
import { fileURLToPath } from "url";
import { ExtractionResult, Node, OsmExtractor, Relation, RouteFilter, Way } from "./osmExtractor";

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
                return [routeId, routeFrom, routeTo, routeRef].join(",");
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
                        .map((node, sectionIndex) => [relation.id, cSectionIndex, sectionIndex, node.lat, node.lon].join(","))
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
        const zippedData = deflate(data);
        await Promise.all([
            writeFile(`../location-analyzer/features/data/${dataName}.csv.zlib`, zippedData),
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
            console.warn(`Relation ${this.relation.tags.name}(${this.relation.id}) has a way that is not connected to any other way`);
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
                startNodeId = nodesToPrint[nodesToPrint.length - 1] ?? startNodeId;
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
        const find = this.remainingWays.findIndex(remainingWay => remainingWay.id === way.id);
        this.remainingWays.splice(find, 1);
    }

    private findWayIntersecting(nodeIds: number[]): Way | undefined {
        return this.remainingWays.find(way => nodeIds.some(nodeId => way.refs?.includes(nodeId)));
    }
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
