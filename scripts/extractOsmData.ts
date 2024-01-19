import { OsmExtractor } from "./osmExtractor";
import { OsmTransformer } from "./osmTransformer";

async function run(): Promise<void> {
    console.log("Extracting OSM data");
    const extractor = new OsmExtractor();
    const extraction = await extractor.extract();

    console.log("Done extracting, transforming");
    const transformer = new OsmTransformer(extraction);
    await transformer.writeToFile();

    console.log("Done");
}

run().catch(console.error);
