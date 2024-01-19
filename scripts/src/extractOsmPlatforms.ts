import { OsmExtractor } from "./osmPlatformExtractor";

async function run(): Promise<void> {
    console.log("Extracting OSM data");
    const extractor = new OsmExtractor();
    await extractor.extract();
    console.log("Done");
}

run().catch(console.error);
