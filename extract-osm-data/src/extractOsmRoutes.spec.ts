import { readFile } from "fs/promises";
import { beforeAll, expect, suite, test } from "vitest";
import { ExtractionResult, Node, Relation, Way } from "./osmExtractor";
import { OsmRouteTransformer } from "./osmRouteTransformer";

suite("extractOsmRoutes", () => {
    const RailRB43ToDorsten = 1998588;
    const RailRB43ToDortmundWithSingleNodeWay = 2455435;
    const Bus390LindenToHerneHasRoundabout = 16335332;
    const S9ToWuppertalThatLeavesTheArea = 60374;
    const Bus381ToBuerRathausCrossesSameWayTwice = 30609;
    const MonorailH1WithSingleWayConsecutiveSectionAtStart = 1901043;
    const MonorailH1WithSingleWayConsecutiveSectionAtEnd = 93947;

    let extraction: ExtractionResult;

    beforeAll(async () => {
        const extractionFixture = await readFile("./fixtures/extractedRoutes.json", "utf-8");
        const parsedExtractionFixture = JSON.parse(extractionFixture) as { relations: Relation[]; ways: Way[]; nodes: Node[] };

        extraction = {
            relations: new Map(parsedExtractionFixture.relations.map((relation: Relation) => [relation.id, relation])),
            ways: new Map(parsedExtractionFixture.ways.map((way: Way) => [way.id, way])),
            nodes: new Map(parsedExtractionFixture.nodes.map((node: Node) => [node.id, node]))
        };
    });

    // removed because it's too big for snapshots
    // test("extracts data", () => {
    //     expect(extraction).toMatchSnapshot();
    // });

    test("transforms simple rail line", () => {
        const transformer = new OsmRouteTransformer(extraction);
        expect(transformer.getTransformed({
            routes: [RailRB43ToDorsten]
        })).toMatchSnapshot();
    });

    test("transforms simple rail line with a single node way", () => {
        const transformer = new OsmRouteTransformer(extraction);
        expect(transformer.getTransformed({
            routes: [RailRB43ToDortmundWithSingleNodeWay]
        })).toMatchSnapshot();
    });

    test("transforms bus line with roundabout", () => {
        const transformer = new OsmRouteTransformer(extraction);
        expect(transformer.getTransformed({
            routes: [Bus390LindenToHerneHasRoundabout]
        })).toMatchSnapshot();
    });

    test("transforms route that partially leaves the area", () => {
        const transformer = new OsmRouteTransformer(extraction);
        expect(transformer.getTransformed({
            routes: [S9ToWuppertalThatLeavesTheArea]
        })).toMatchSnapshot();
    });

    test("transforms route that uses the same way twice", () => {
        const transformer = new OsmRouteTransformer(extraction);
        expect(transformer.getTransformed({
            routes: [Bus381ToBuerRathausCrossesSameWayTwice]
        })).toMatchSnapshot();
    });

    test("ignores consecutive section at start of route where it cannot determine a start node, because there is only one way", () => {
        const transformer = new OsmRouteTransformer(extraction);
        expect(transformer.getTransformed({
            routes: [MonorailH1WithSingleWayConsecutiveSectionAtStart]
        })).toMatchSnapshot();
    });

    test("ignores consecutive section at end of route where it cannot determine a start node, because there is only one way", () => {
        const transformer = new OsmRouteTransformer(extraction);
        expect(transformer.getTransformed({
            routes: [MonorailH1WithSingleWayConsecutiveSectionAtEnd]
        })).toMatchSnapshot();
    });
});
