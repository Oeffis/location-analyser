import { writeFile } from "fs/promises";
import { deflate } from "pako";
import { RouteSorter } from "./RouteSorter";
import { ExtractionResult, Node, Relation, RouteFilter, Way } from "./osmExtractor";


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

    public getTransformed(filter?: RouteFilter): { routes: string; sections: string; } {
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
        const sections = relationsAsArray.flatMap(relation => new RouteSorter(relation, this.ways)
            .getConsecutiveSections()
            .flatMap((cSection, cSectionIndex) => cSection
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
