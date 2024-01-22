import { stringify } from "csv/sync";
import { writeFile } from "fs/promises";
import { deflate } from "pako";
import { ExtractionResult, Node, Relation, Way } from "./osmExtractor";
import { PlatformBoundarySorter } from "./platformBoundarySorter";

export class OsmPlatformTransformer {
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
        const { platforms, platformBounds } = this.getTransformed();

        await Promise.all([
            this.zipAndWrite(platforms, "platforms"),
            this.zipAndWrite(platformBounds, "platformBounds")
        ]);
    }

    public getTransformed(filter?: PlatformFilter): { platforms: (string | number)[][]; platformBounds: (string | number)[][]; } {
        const platforms = this.getTransformedPlatforms(filter);
        const platformBounds = this.getTransformedPlatformBounds(filter);
        return { platforms, platformBounds };
    }

    private getTransformedPlatforms(filter?: PlatformFilter): (string | number)[][] {
        const header = ["id", "name"];
        let output = Array.from(this.nodes.values())
            .filter(node => node.tags?.public_transport === "platform" && (!filter?.platforms || filter.platforms.includes(node.id)))
            .map(node => {
                const platformId = node.id;
                const platformName = node.tags?.description ?? node.tags?.name ?? "";
                return [platformId, platformName];
            });

        output = output.concat(Array.from(this.ways.values())
            .filter(way => way.tags?.public_transport === "platform" && (!filter?.platforms || filter.platforms.includes(way.id)))
            .map(way => {
                const platformId = way.id;
                const platformName = way.tags?.description ?? way.tags?.name ?? "";
                return [platformId, platformName];
            }));

        output = output.concat(Array.from(this.relations.values())
            .filter(relation => relation.tags?.public_transport === "platform" && (!filter?.platforms || filter.platforms.includes(relation.id)))
            .map(relation => {
                const platformId = relation.id;
                const platformName = relation.tags?.description ?? relation.tags?.name ?? "";
                return [platformId, platformName];
            }));

        return [header, ...output];
    }

    private getTransformedPlatformBounds(filter?: PlatformFilter): (string | number)[][] {
        const header = ["id", "latitude", "longitude"];
        let output = Array.from(this.nodes.values())
            .filter(node => node.tags?.public_transport === "platform" && (!filter?.platforms || filter.platforms.includes(node.id)))
            .map(node => {
                const platformId = node.id;
                const platformLat = node.lat;
                const platformLon = node.lon;
                return [platformId, platformLat, platformLon];
            });

        output = output.concat(Array.from(this.ways.values())
            .filter(way => way.tags?.public_transport === "platform" && (!filter?.platforms || filter.platforms.includes(way.id)))
            .flatMap(way => {
                const platformId = way.id;
                const nodes = way.refs?.map(nodeId => this.getNodeOrThrow(nodeId)) ?? [];
                return nodes.map(node => [platformId, node.lat, node.lon]);
            }));

        output = output.concat(Array.from(this.relations.values())
            .filter(relation => relation.tags?.public_transport === "platform" && (!filter?.platforms || filter.platforms.includes(relation.id)))
            .flatMap(relation => {
                const platformId = relation.id;

                const sections = new PlatformBoundarySorter(relation, this.ways)
                    .getConsecutiveSections();

                if (sections.length === 0 || sections.length > 1) {
                    throw new Error(`Relation ${relation.id} has ${sections.length} sections`);
                }

                const nodes = sections[0]?.map(nodeId => this.getNodeOrThrow(nodeId)) ?? [];

                return nodes.map(node => [platformId, node.lat, node.lon]);
            }));

        return [header, ...output];

    }

    private getWayOrThrow(wayId: number): Way {
        const way = this.ways.get(wayId);
        if (!way) throw new Error(`Way ${wayId} not found`);
        return way;
    }

    private getNodeOrThrow(nodeId: number): Node {
        const node = this.nodes.get(nodeId);
        if (!node) throw new Error(`Node ${nodeId} not found`);
        return node;
    }

    private async zipAndWrite(data: (string | number)[][], dataName: string): Promise<void> {
        const csv = stringify(data);
        const zippedData = deflate(csv);
        await Promise.all([
            writeFile(`../location-analyzer/features/data/${dataName}.csv.zlib`, zippedData),
            writeFile(`../raw/no-git/${dataName}.csv`, csv)
        ]);
    }
}

export interface PlatformFilter {
    platforms?: number[];
}
