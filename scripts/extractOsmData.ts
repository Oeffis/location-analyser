import { createOSMStream } from "osm-pbf-parser-node";

class OsmExtractor {
    private readonly waysToKeep = new Set<number>();
    private readonly nodesToKeep = new Set<number>();
    private readonly relations: Relation[] = [];
    private readonly nodes: Node[] = [];

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
        let stream = createOSMStream("../raw/no-git/Bochum.osm.pbf") as AsyncGenerator<OSMType, void>;
        for await (const item of stream) {
            if (isRoot(item)) continue;
            if (isRelation(item)) {
                if (item.tags.type !== "route") continue;
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                if (!this.routeTypes.includes(item.tags.route!)) continue;
                this.relations.push(item);
                const ways = item.members
                    .filter(member => member.type === "way"
                        && member.role === "")
                    .map(member => member.ref);
                ways.forEach(way => this.waysToKeep.add(way));
                continue;
            }
        }
        console.timeEnd("Relations");

        console.time("Ways");
        stream = createOSMStream("../raw/no-git/Bochum.osm.pbf") as AsyncGenerator<OSMType, void>;
        for await (const item of stream) {
            if (isRoot(item)) continue;
            if (isWay(item)) {
                if (!this.waysToKeep.has(item.id)) continue;
                const nodes = item.refs ?? [];
                nodes.forEach(node => this.nodesToKeep.add(node));
                continue;
            }
        }
        console.timeEnd("Ways");

        console.time("Nodes");
        stream = createOSMStream("../raw/no-git/Bochum.osm.pbf") as AsyncGenerator<OSMType, void>;
        for await (const item of stream) {
            if (isRoot(item)) continue;
            if (isNode(item)) {
                if (!this.nodesToKeep.has(item.id)) continue;
                this.nodes.push(item);
                continue;
            }
        }
        console.timeEnd("Nodes");

        console.log("Done filtering, checking if we have everything");

        const missing = Array.from(this.nodesToKeep.values()).filter(node => !this.nodes.find(n => n.id === node));
        if (missing.length > 0) {
            console.log("Missing nodes", missing);
        } else {
            console.log(`All nodes onboard (${this.nodes.length} for ${this.relations.length} routes)`);
        }

        function isRoot(item: OSMType): item is Root {
            // eslint-disable-next-line no-prototype-builtins
            return !item.hasOwnProperty("type");
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
    }
}

const extractor = new OsmExtractor();
extractor.extract().catch(console.error);

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
