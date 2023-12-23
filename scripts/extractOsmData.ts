import { writeFile } from "fs/promises";
import { createOSMStream } from "osm-pbf-parser-node";
import { deflate } from "pako";

interface StreamFilter<C extends OSMType> {
    typeGuard: (item: OSMType) => item is C;
    filter: (item: C) => boolean;
    onMatch: (item: C) => void;
}

class OsmExtractor {
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

    public async extract(): Promise<void> {
        const relations = await this.getRelations();
        const wayIdsToKeep = this.getWayIds(relations);
        const ways = await this.getWays(wayIdsToKeep);
        const nodeIdsToKeep = this.getNodeIds(ways);
        const nodes = await this.getNodes(nodeIdsToKeep);
        console.log("Done filtering, checking if we have everything");

        this.verifyWayCompleteness(wayIdsToKeep, ways);
        this.verifyNodeCompleteness(nodeIdsToKeep, nodes);
        console.log(`All ${nodes.size} node found in ${ways.size} ways for ${relations.size} routes.`);

        console.log("Writing to file");
        await this.writeToFile(relations, ways, nodes);
    }

    private async getRelations(): Promise<Map<number, Relation>> {
        const relations = new Map<number, Relation>();

        await this.filterStream({
            typeGuard: isRelation,
            filter: relation => relation.tags.type === "route"
                && this.routeTypes.includes(relation.tags.route ?? ""),
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

    private async writeToFile(
        relations: Map<number, Relation>,
        ways: Map<number, Way>,
        nodes: Map<number, Node>
    ): Promise<void> {
        let routes = "id,from,to,ref\n";
        let sections = "route_id,sequence_number,lat,lon\n";

        relations.forEach(relation => {
            const routeId = relation.id;
            const routeRef = relation.tags.ref ?? "";
            const routeFrom = relation.tags.from ?? "";
            const routeTo = relation.tags.to ?? "";
            routes += `${routeId},${routeFrom},${routeTo},${routeRef}\n`;

            const waysInRelation = relation
                .members
                .filter(member => member.type === "way" && member.role === "")
                .map(member => member.ref);

            let sequenceNumber = 0;
            waysInRelation.forEach(wayId => {
                const way = ways.get(wayId);
                if (!way) throw new Error(`Way ${wayId} not found`);
                const wayNodes = way.refs?.map(ref => nodes.get(ref));
                if (!wayNodes) throw new Error(`Way ${wayId} has no nodes`);
                wayNodes.forEach(node => {
                    if (!node) throw new Error(`Node ${node} not found`);
                    sections += `${routeId},${sequenceNumber},${node.lat},${node.lon}\n`;
                    sequenceNumber++;
                });
            });
        });

        const zippedRoutes = deflate(routes);
        const zippedSections = deflate(sections);
        await Promise.all([
            writeFile("../location-analyzer/features/data/routes.csv.zlib", zippedRoutes),
            writeFile("../location-analyzer/features/data/sections.csv.zlib", zippedSections)
        ]);
    }
}

const extractor = new OsmExtractor();
extractor.extract().catch(console.error);

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
