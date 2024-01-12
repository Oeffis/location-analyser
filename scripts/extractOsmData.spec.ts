import { expect, test } from "vitest";
import { OsmExtractor } from "./extractOsmData";

test("extract RB 43 to Dorsten", async () => {
    const RB43ToDorsten = 1998588; // normal railway route, completely contained
    const Bus390LindenToHerne = 16335332; // bus route, contains roundabouts
    const extractor = new OsmExtractor();

    const data = await extractor.getTransformed({
        relations: [RB43ToDorsten, Bus390LindenToHerne]
    });

    expect(data).toMatchSnapshot();
}, { timeout: 60000 });
