import { mkdir, readFile, writeFile } from "fs/promises";
import { beforeAll, expect, suite, test } from "vitest";
import { ExtractionResult, Node, OsmExtractor, OsmTransformer, Relation, Way } from "./extractOsmData";

suite("extractOsmData", () => {
    const RailRB43ToDorsten = 1998588; // normal railway route, completely contained
    const Bus390LindenToHerneHasRoundabout = 16335332;

    let extractor: OsmExtractor;
    let extraction: ExtractionResult;

    beforeAll(async () => {
        extractor = new OsmExtractor();

        try {
            const cachedExtraction = await readFile("./test-cache/extracted.json", "utf-8");
            console.log("using cached extraction");

            const parsedCachedExtraction = JSON.parse(cachedExtraction) as { relations: Relation[]; ways: Way[]; nodes: Node[] };
            extraction = {
                relations: new Map(parsedCachedExtraction.relations.map((relation: Relation) => [relation.id, relation])),
                ways: new Map(parsedCachedExtraction.ways.map((way: Way) => [way.id, way])),
                nodes: new Map(parsedCachedExtraction.nodes.map((node: Node) => [node.id, node]))
            };
        } catch (e) {
            console.warn("no cached extraction found, extracting from OSM");
            console.error(e);
            extraction = await extractor.extract();
            await mkdir("./test-cache", { recursive: true });
            await writeFile("./test-cache/extracted.json", JSON.stringify({
                relations: Array.from(extraction.relations.values()),
                ways: Array.from(extraction.ways.values()),
                nodes: Array.from(extraction.nodes.values())
            }));
        }
    }, 60000);

    test("extracts data", () => {
        expect(extraction).toMatchSnapshot();
    });

    test("transforms simple rail line", () => {
        const transformer = new OsmTransformer(extraction);
        expect(transformer.getTransformed({
            routes: [RailRB43ToDorsten]
        })).toMatchSnapshot();
    });

    test("transforms bus line with roundabout", () => {
        const transformer = new OsmTransformer(extraction);
        expect(transformer.getTransformed({
            routes: [Bus390LindenToHerneHasRoundabout]
        })).toMatchSnapshot();
    });
});
