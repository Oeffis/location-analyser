import { mkdir, readFile, writeFile } from "fs/promises";
import { beforeAll, expect, suite, test } from "vitest";
import { ExtractionResult, Node, OsmExtractor, Relation, Way } from "./osmPlatformExtractor";

suite("extractOsmPlatforms", () => {
    const BusStopRheinelbestraße = 6107133039;
    const TramStopRheinelbestraße = 125776045;

    let extractor: OsmExtractor;
    let extraction: ExtractionResult;

    beforeAll(async () => {
        extractor = new OsmExtractor();

        try {
            const cachedExtraction = await readFile("./test-cache/extractedPlatforms.json", "utf-8");
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
            await writeFile("./test-cache/extractedPlatforms.json", JSON.stringify({
                relations: Array.from(extraction.relations.values()),
                ways: Array.from(extraction.ways.values()),
                nodes: Array.from(extraction.nodes.values())
            }));
        }
    }, 60000);

    test("extracts simple bus stop", () => {
        const node = extraction.nodes.get(BusStopRheinelbestraße);

        expect(node).not.toBeUndefined();
        expect(node).toMatchSnapshot();
    });

    test("extracts simple tram platform", () => {
        const way = extraction.ways.get(TramStopRheinelbestraße);

        expect(way).not.toBeUndefined();
        expect(way).toMatchSnapshot();
        for (const nodeId of way?.refs ?? []) {
            const node = extraction.nodes.get(nodeId);
            expect(node).not.toBeUndefined();
            expect(node).toMatchSnapshot();
        }
    });
});
