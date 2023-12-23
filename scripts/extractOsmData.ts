import { createOSMStream } from "osm-pbf-parser-node";

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
        const nodeIdsToKeep = await this.getNodeIds(wayIdsToKeep);
        const nodes = await this.getNodes(nodeIdsToKeep);
        console.log("Done filtering, checking if we have everything");

        this.verifyCompleteness(nodeIdsToKeep, nodes);
        console.log(`All ${nodes.length} node found for ${relations.length} routes.`);
    }

    private async getRelations(): Promise<Relation[]> {
        const relations: Relation[] = [];

        await this.filterStream({
            typeGuard: isRelation,
            filter: relation => relation.tags.type === "route"
                && this.routeTypes.includes(relation.tags.route ?? ""),
            onMatch: relation => void relations.push(relation)
        });

        return relations;
    }

    private getWayIds(relations: Relation[]): Set<number> {
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

    private async getNodeIds(waysToKeep: Set<number>): Promise<Set<number>> {
        const nodesToKeep = new Set<number>();

        await this.filterStream({
            typeGuard: isWay,
            filter: way => waysToKeep.has(way.id),
            onMatch: way => (way.refs ?? []).forEach(node => nodesToKeep.add(node))
        });

        return nodesToKeep;
    }

    private async getNodes(nodeIdsToKeep: Set<number>): Promise<Node[]> {
        const nodes: Node[] = [];

        await this.filterStream({
            typeGuard: isNode,
            filter: node => nodeIdsToKeep.has(node.id),
            onMatch: node => void nodes.push(node)
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

    private verifyCompleteness(nodeIdsToKeep: Set<number>, nodes: Node[]): void {
        const missing = Array.from(nodeIdsToKeep.values()).filter(node => !nodes.find(n => n.id === node));
        if (missing.length > 0) {
            throw new Error(`Missing ${missing.length} nodes: ${missing.join(", ")}`);
        }
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
