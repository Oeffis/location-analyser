import { parse } from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { OsmExtractor } from "./osmExtractor";
import { OsmPlatformTransformer } from "./osmPlatformTransformer";
import { OsmRouteTransformer } from "./osmRouteTransformer";

async function run(): Promise<void> {
    const argv = await yargs(hideBin(process.argv))
        .options({
            inFile: { type: "string", demandOption: true, alias: "i" },
            outDir: { type: "string", demandOption: false, alias: "o" },
            uncompressedOutFile: { type: "boolean", demandOption: false, alias: "u" },
            platforms: { type: "boolean", demandOption: false, alias: "p" },
            routes: { type: "boolean", demandOption: false, alias: "r" }
        })
        .parse();

    if (argv.routes ?? !argv.platforms) {
        await extractRoutes(argv);
    }
    if (argv.platforms ?? !argv.routes) {
        await extractPlatforms(argv);
    }
}

run().catch(console.error);

async function extractRoutes(argv: { inFile: string; outDir: string | undefined; uncompressedOutFile: boolean | undefined; }): Promise<void> {
    console.log("Extracting Routes from OSM data");
    const extractor = OsmExtractor.forTracks(argv.inFile);
    const extraction = await extractor.extract();

    console.log("Done extracting, transforming");
    const transformer = new OsmRouteTransformer(extraction);
    if (argv.uncompressedOutFile) {
        await transformer.writeToDir(argv.outDir ?? parse(argv.inFile).dir);
    } else {
        await transformer.writeCompressedToDir(argv.outDir ?? parse(argv.inFile).dir);
    }

    console.log("Done");
}

async function extractPlatforms(argv: { inFile: string; outDir: string | undefined; uncompressedOutFile: boolean | undefined; }): Promise<void> {
    console.log("Extracting Platforms from OSM data");
    const extractor = OsmExtractor.forPlatforms(argv.inFile);
    const extraction = await extractor.extract();

    console.log("Done extracting, transforming");
    const transformer = new OsmPlatformTransformer(extraction);
    if (argv.uncompressedOutFile) {
        await transformer.writeToDir(argv.outDir ?? parse(argv.inFile).dir);
    } else {
        await transformer.writeCompressedToDir(argv.outDir ?? parse(argv.inFile).dir);
    }

    console.log("Done");
}

export * from "./osmExtractor";
export * from "./osmPlatformTransformer";
export * from "./osmRouteTransformer";
