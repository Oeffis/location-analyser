import { expect, test } from "vitest";
import { OsmExtractor } from "./extractOsmData";

test("extract RB 43 to Dorsten", async () => {
    const RB43ToDorsten = 1998588;
    const extractor = new OsmExtractor();

    const data = await extractor.getTransformed({
        relations: [RB43ToDorsten]
    });

    expect(data).toMatchSnapshot();
}, { timeout: 240000 });
