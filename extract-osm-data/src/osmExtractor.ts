import { createOSMStream } from "osm-pbf-parser-node";

export class OsmExtractor {
    public constructor(
        protected readonly filePath: string,
        protected readonly relationFilter: Filter<Relation>,
        protected readonly wayIdFilter: Filter<Member>,
        protected readonly additionalWaysFilter: Filter<Way>,
        protected readonly additionalNodesFilter: Filter<Node>
    ) { }

    public async extract(): Promise<ExtractionResult> {
        const relations = await this.getRelations();
        const wayIdsToKeep = this.getWayIds(relations);
        const ways = await this.getWays(wayIdsToKeep);
        const nodeIdsToKeep = this.getNodeIds(ways);
        const nodes = await this.getNodes(nodeIdsToKeep);
        console.log("Done filtering, checking if we have everything");

        this.verifyWayCompleteness(wayIdsToKeep, ways);
        this.verifyNodeCompleteness(nodeIdsToKeep, nodes);

        return {
            relations,
            ways,
            nodes
        };
    }

    protected async getRelations(): Promise<Map<number, Relation>> {
        const relations = new Map<number, Relation>();

        await this.filterStream({
            typeGuard: isRelation,
            filter: this.relationFilter,
            onMatch: relation => void relations.set(relation.id, relation)
        });

        return relations;
    }

    protected getWayIds(relations: Map<number, Relation>): Set<number> {
        const wayIds = new Set<number>();
        relations.forEach(relation => {
            const ways = relation
                .members
                .filter(this.wayIdFilter)
                .map(member => member.ref);
            ways.forEach(way => wayIds.add(way));
        });
        return wayIds;
    }

    protected async getWays(wayIdsToKeep: Set<number>): Promise<Map<number, Way>> {
        const ways = new Map<number, Way>();

        await this.filterStream({
            typeGuard: isWay,
            filter: way => wayIdsToKeep.has(way.id) || this.additionalWaysFilter(way),
            onMatch: way => void ways.set(way.id, way)
        });

        return ways;
    }

    protected getNodeIds(ways: Map<number, Way>): Set<number> {
        const nodesToKeep = new Set<number>();
        ways.forEach(way => way.refs?.forEach(node => nodesToKeep.add(node)));
        return nodesToKeep;
    }

    protected async getNodes(nodeIdsToKeep: Set<number>): Promise<Map<number, Node>> {
        const nodes = new Map<number, Node>();

        await this.filterStream({
            typeGuard: isNode,
            filter: node => nodeIdsToKeep.has(node.id) || this.additionalNodesFilter(node),
            onMatch: node => void nodes.set(node.id, node)
        });

        return nodes;
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
        return createOSMStream(this.filePath) as AsyncGenerator<OSMType, void>;
    }

    protected verifyWayCompleteness(wayIdsToKeep: Set<number>, ways: Map<number, Way>): void {
        const missing = [...wayIdsToKeep].filter(id => !ways.has(id));
        if (missing.length > 0) {
            console.warn(`${missing.length} of ${ways.size} ways missing (possibly out of area bounds)`);
        }
    }

    protected verifyNodeCompleteness(nodeIdsToKeep: Set<number>, nodes: Map<number, Node>): void {
        const missing = [...nodeIdsToKeep].filter(id => !nodes.has(id));
        const areMissing = missing.length > 0;
        if (areMissing) {
            console.warn(`${missing.length} of ${nodes.size} nodes missing (possibly out of area bounds)`);
        }
    }

    public static forTracks(file: string): OsmExtractor {
        const routeTypes = [
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
        return new OsmExtractor(
            file,
            r => r.tags?.type === "route" && routeTypes.includes(r.tags.route ?? ""),
            m => m.type === "way" && m.role === "",
            () => false,
            () => false
        );
    }

    public static forPlatforms(file: string): OsmExtractor {
        return new OsmExtractor(
            file,
            r => r.tags?.public_transport === "platform",
            m => m.type === "way" && m.role === "outer",
            w => w.tags?.public_transport === "platform",
            n => n.tags?.public_transport === "platform"
        );
    }
}

export interface ExtractionResult {
    relations: Map<number, Relation>;
    ways: Map<number, Way>;
    nodes: Map<number, Node>;
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
    members: Member[];
    tags?: Record<string, string>;
}

export interface Member {
    type: "node" | "way" | "relation";
    ref: number;
    role: string;
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

export type Filter<T> = (item: T) => boolean;
