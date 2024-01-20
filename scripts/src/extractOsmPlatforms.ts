import { OsmExtractor } from "./osmExtractor";

async function run(): Promise<void> {
    console.log("Extracting OSM data");
    const extractor = OsmExtractor.forPlatforms();
    await extractor.extract();
    console.log("Done");
}

run().catch(console.error);
