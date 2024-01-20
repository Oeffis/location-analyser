import { OsmExtractor } from "./osmExtractor";
import { OsmPlatformTransformer } from "./osmPlatformTransformer";

async function run(): Promise<void> {
    console.log("Extracting OSM data");
    const extractor = OsmExtractor.forPlatforms();
    const extraction = await extractor.extract();

    console.log("Done extracting, transforming");
    const transformer = new OsmPlatformTransformer(extraction);
    await transformer.writeToFile();

    console.log("Done");
}

run().catch(console.error);
