import { writeFile } from "fs/promises";
import { deflate } from "pako";
import { ExtractionResult, Node, Relation, Way } from "./osmExtractor";

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

    public getTransformed(filter?: PlatformFilter): { platforms: string; platformBounds: string; } {
        const platforms = this.getTransformedPlatforms(filter);
        // const platformBounds = this.getTransformedPlatformBounds(filter);
        return { platforms, platformBounds: "" };
    }

    public getTransformedPlatforms(filter?: PlatformFilter): string {
        return Array.from(this.nodes.values())
            .filter(node => node.tags?.public_transport === "platform" && (!filter?.platforms || filter.platforms.includes(node.id)))
            .map(node => {
                const platformId = node.id;
                const platformName = node.tags?.name;
                return [platformId, platformName].join(",");
            }).join("\n");
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

export interface PlatformFilter {
    platforms?: number[];
}
