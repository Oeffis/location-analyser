import { createOSMStream } from "osm-pbf-parser-node";

export abstract class OsmExtractor {
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

    protected abstract getRelations(routes: number[] | undefined): Promise<Map<number, Relation>>;
    protected abstract getWayIds(relations: Map<number, Relation>): Set<number>;
    protected abstract getWays(wayIdsToKeep: Set<number>): Promise<Map<number, Way>>;
    protected abstract getNodes(nodeIdsToKeep: Set<number>): Promise<Map<number, Node>>;

    protected getNodeIds(ways: Map<number, Way>): Set<number> {
        const nodesToKeep = new Set<number>();
        ways.forEach(way => way.refs?.forEach(node => nodesToKeep.add(node)));
        return nodesToKeep;
    }

    protected async filterStream<C extends OSMType>({ typeGuard: typeFilter, filter: filterFunction, onMatch: doFunction }: StreamFilter<C>): Promise<void> {
        const stream = this.createStream();
        for await (const item of stream) {
            if (!typeFilter(item)) continue;
            if (!filterFunction(item)) continue;
            doFunction(item);
        }
    }

    protected createStream(): AsyncGenerator<OSMType, void> {
        return createOSMStream("../raw/no-git/Bochum.osm.pbf") as AsyncGenerator<OSMType, void>;
    }

    protected verifyWayCompleteness(wayIdsToKeep: Set<number>, ways: Map<number, Way>): void {
        const missing = [...wayIdsToKeep].filter(id => !ways.has(id));
        if (missing.length > 0) {
            throw new Error(`Missing ${missing.length} ways: ${missing.join(", ")}`);
        }
    }

    protected verifyNodeCompleteness(nodeIdsToKeep: Set<number>, nodes: Map<number, Node>): void {
        const missing = [...nodeIdsToKeep].filter(id => !nodes.has(id));
        const areMissing = missing.length > 0;
        if (areMissing) {
            throw new Error(`Missing ${missing.length} nodes: ${missing.join(", ")}`);
        }
    }
}

export interface RouteFilter {
    routes?: number[];
}

export interface ExtractionResult {
    relations: Map<number, Relation>;
    ways: Map<number, Way>;
    nodes: Map<number, Node>;
}

export interface RouteFilter {
    routes?: number[];
}

export interface StreamFilter<C extends OSMType> {
    typeGuard: (item: OSMType) => item is C;
    filter: (item: C) => boolean;
    onMatch: (item: C) => void;
}

export type OSMNonRootType = Node | Way | Relation;
export type OSMType = Root | OSMNonRootType;

export interface Root {
    source: string;
}

export interface Node {
    type: "node";
    id: number;
    lat: number;
    lon: number;
    tags?: Record<string, string>;
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
    tags?: Record<string, string>;
}

export function isNode(item: OSMType): item is Node {
    return (item as OSMNonRootType).type === "node";
}

export function isWay(item: OSMType): item is Way {
    return (item as OSMNonRootType).type === "way";
}

export function isRelation(item: OSMType): item is Relation {
    return (item as OSMNonRootType).type === "relation";
}
