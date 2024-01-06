import { expect, test } from "vitest";
import { OsmExtractor } from "./extractOsmData";

test("extract RB 43 to Dorsten", async () => {
    const RB43ToDorsten = 1998588;
    const extractor = new OsmExtractor();

    const data = await extractor.extract({
        relations: [RB43ToDorsten]
    });

    expect(data.relations).toHaveLength(1);
    expect(data.ways).toHaveLength(164);
    expect(data.nodes).toHaveLength(715);
    expect(data).toMatchSnapshot();
}, { timeout: 60000 });
