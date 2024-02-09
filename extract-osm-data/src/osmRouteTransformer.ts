import { stringify } from "csv-stringify/sync";
import { writeFile } from "fs/promises";
import { deflate } from "pako";
import { ExtractionResult, Node, Relation, Way } from "./osmExtractor";
import { RouteSorter } from "./routeSorter";

export class OsmRouteTransformer {
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

    public async writeToDir(outDir: string): Promise<void> {
        const { routes, sections } = this.getTransformed();

        await Promise.all([
            writeFile(`${outDir}/routes.csv`, stringify(routes)),
            writeFile(`${outDir}/sections.csv`, stringify(sections))
        ]);
    }

    public async writeCompressedToDir(outDir: string): Promise<void> {
        const { routes, sections } = this.getTransformed();

        const zippedRoutes = deflate(stringify(routes));
        const zippedSections = deflate(stringify(sections));

        await Promise.all([
            writeFile(`${outDir}/routes.csv.zlib`, zippedRoutes),
            writeFile(`${outDir}/sections.csv.zlib`, zippedSections)
        ]);
    }

    public getTransformed(filter?: RouteFilter): { routes: (string | number)[][]; sections: (string | number)[][]; } {
        const routes = this.getTransformedRoutes(filter);
        const sections = this.getTransformedSections(filter);
        return { routes, sections };
    }

    public getTransformedRoutes(filter?: RouteFilter): (string | number)[][] {
        const header = ["id", "from", "to", "ref"];
        const output = Array.from(this.relations.values())
            .filter(relation => !filter?.routes || filter.routes.includes(relation.id))
            .map(relation => {
                const routeId = relation.id;
                const routeRef = relation.tags?.ref ?? "";
                const routeFrom = relation.tags?.from ?? "";
                const routeTo = relation.tags?.to ?? "";
                return [routeId, routeFrom, routeTo, routeRef];
            });
        return [header, ...output];
    }

    private getTransformedSections(filter?: RouteFilter): (string | number)[][] {
        const header = ["routeId", "consecutiveSection", "section", "lat", "lon"];
        const relationsAsArray = Array.from(this.relations.values())
            .filter(relation => !filter?.routes || filter.routes.includes(relation.id));
        const sections = relationsAsArray.flatMap(relation => new RouteSorter(relation, this.ways)
            .getConsecutiveSections()
            .flatMap((cSection, cSectionIndex) => cSection
                .map(nodeId => this.getNodeOrThrow(nodeId))
                .map((node, sectionIndex) => [relation.id, cSectionIndex, sectionIndex, node.lat, node.lon])
            )
        );
        return [header, ...sections];
    }

    private getNodeOrThrow(nodeId: number): Node {
        const node = this.nodes.get(nodeId);
        if (!node) throw new Error(`Node ${nodeId} not found`);
        return node;
    }
}

export interface RouteFilter {
    routes?: number[];
}
