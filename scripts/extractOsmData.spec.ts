import { beforeAll, expect, suite, test } from "vitest";
import { ExtractionResult, OsmExtractor, OsmTransformer } from "./extractOsmData";

suite("extractOsmData", () => {
    const RailRB43ToDorsten = 1998588; // normal railway route, completely contained
    const Bus390LindenToHerneHasRoundabout = 16335332;

    let extractor: OsmExtractor;
    let extraction: ExtractionResult;

    beforeAll(async () => {
        extractor = new OsmExtractor();
        extraction = await extractor.extract();
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
