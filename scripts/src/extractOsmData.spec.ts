import { mkdir, readFile, writeFile } from "fs/promises";
import { beforeAll, expect, suite, test } from "vitest";
import { ExtractionResult, Node, Relation, Way } from "./osmExtractor";
import { OsmTrackExtractor } from "./osmTrackExtractor";
import { OsmTransformer } from "./osmTransformer";

suite("extractOsmData", () => {
    const RailRB43ToDorsten = 1998588;
    const RailRB43ToDortmundWithSingleNodeWay = 2455435;
    const Bus390LindenToHerneHasRoundabout = 16335332;
    const S9ToWuppertalThatLeavesTheArea = 60374;
    const Bus381ToBuerRathausCrossesSameWayTwice = 30609;
    const MonorailH1WithSingleWayConsecutiveSectionAtStart = 1901043;
    const MonorailH1WithSingleWayConsecutiveSectionAtEnd = 93947;

    let extractor: OsmTrackExtractor;
    let extraction: ExtractionResult;

    beforeAll(async () => {
        extractor = new OsmTrackExtractor();

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

    // removed because it's too big for snapshots
    // test("extracts data", () => {
    //     expect(extraction).toMatchSnapshot();
    // });

    test("transforms simple rail line", () => {
        const transformer = new OsmTransformer(extraction);
        expect(transformer.getTransformed({
            routes: [RailRB43ToDorsten]
        })).toMatchSnapshot();
    });

    test("transforms simple rail line with a single node way", () => {
        const transformer = new OsmTransformer(extraction);
        expect(transformer.getTransformed({
            routes: [RailRB43ToDortmundWithSingleNodeWay]
        })).toMatchSnapshot();
    });

    test("transforms bus line with roundabout", () => {
        const transformer = new OsmTransformer(extraction);
        expect(transformer.getTransformed({
            routes: [Bus390LindenToHerneHasRoundabout]
        })).toMatchSnapshot();
    });

    test("transforms route that partially leaves the area", () => {
        const transformer = new OsmTransformer(extraction);
        expect(transformer.getTransformed({
            routes: [S9ToWuppertalThatLeavesTheArea]
        })).toMatchSnapshot();
    });

    test("transforms route that uses the same way twice", () => {
        const transformer = new OsmTransformer(extraction);
        expect(transformer.getTransformed({
            routes: [Bus381ToBuerRathausCrossesSameWayTwice]
        })).toMatchSnapshot();
    });

    test("ignores consecutive section at start of route where it cannot determine a start node, because there is only one way", () => {
        const transformer = new OsmTransformer(extraction);
        expect(transformer.getTransformed({
            routes: [MonorailH1WithSingleWayConsecutiveSectionAtStart]
        })).toMatchSnapshot();
    });

    test("ignores consecutive section at end of route where it cannot determine a start node, because there is only one way", () => {
        const transformer = new OsmTransformer(extraction);
        expect(transformer.getTransformed({
            routes: [MonorailH1WithSingleWayConsecutiveSectionAtEnd]
        })).toMatchSnapshot();
    });
});
