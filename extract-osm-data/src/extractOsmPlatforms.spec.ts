import { readFile } from "fs/promises";
import { beforeAll, expect, suite, test } from "vitest";
import { ExtractionResult, Node, Relation, Way } from "./osmExtractor";
import { OsmPlatformTransformer } from "./osmPlatformTransformer";

suite("extractOsmPlatforms", () => {
    const BusStopRheinelbestraße = 6107133039;
    const TramStopRheinelbestraße = 125776045;
    const TrainStationGelsenkirchenPlatforms4and5 = 4250656;
    const TrainStationWittenPlatforms3and4WithMultipleOuterWays = 4140213;

    let extraction: ExtractionResult;

    beforeAll(async () => {
        const extractionFixture = await readFile("./fixtures/extractedPlatforms.json", "utf-8");
        const parsedExtractionFixture = JSON.parse(extractionFixture) as { relations: Relation[]; ways: Way[]; nodes: Node[] };

        extraction = {
            relations: new Map(parsedExtractionFixture.relations.map((relation: Relation) => [relation.id, relation])),
            ways: new Map(parsedExtractionFixture.ways.map((way: Way) => [way.id, way])),
            nodes: new Map(parsedExtractionFixture.nodes.map((node: Node) => [node.id, node]))
        };
    });

    suite("extracts", () => {
        test("extracts single point bus stop", () => {
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

        test("extracts outer section of a train station platform", () => {
            const relation = extraction.relations.get(TrainStationGelsenkirchenPlatforms4and5);

            expect(relation).not.toBeUndefined();
            expect(relation).toMatchSnapshot();

            for (const wayId of relation?.members.filter(member => member.role === "outer").map(m => m.ref) ?? []) {
                const way = extraction.ways.get(wayId);

                expect(way, `Way ${wayId} not found`).not.toBeUndefined();
                expect(way).toMatchSnapshot();
                for (const nodeId of way?.refs ?? []) {
                    const node = extraction.nodes.get(nodeId);
                    expect(node).not.toBeUndefined();
                    expect(node).toMatchSnapshot();
                }
            }

            for (const wayId of relation?.members.filter(member => member.role === "inner").map(m => m.ref) ?? []) {
                expect(extraction.ways.has(wayId)).toBeFalsy();
            }
        });
    });

    suite("transforms", () => {
        test("transforms platforms", () => {
            const transformer = new OsmPlatformTransformer(extraction);
            const transformed = transformer.getTransformed({ platforms: [BusStopRheinelbestraße, TramStopRheinelbestraße, TrainStationGelsenkirchenPlatforms4and5, TrainStationWittenPlatforms3and4WithMultipleOuterWays] });

            expect(transformed).toMatchSnapshot();
        });
    });
});
