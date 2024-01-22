/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { parse } from "csv";
import { readFile } from "fs/promises";
import { inflate } from "pako";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { Stop } from "../src/locationAnalyzer.js";

export async function getVrrStops(): Promise<Stop[]> {
    const platforms = await loadPlatforms();
    const platformBounds = await loadPlatformBounds();

    let platformBoundIndex = 0;
    for (const platform of platforms) {
        platform.boundaries = [];
        while (platformBoundIndex < platformBounds.length && platformBounds[platformBoundIndex]?.id === platform.id) {
            platform.boundaries.push({
                latitude: parseFloat(platformBounds[platformBoundIndex]!.latitude as unknown as string),
                longitude: parseFloat(platformBounds[platformBoundIndex]!.longitude as unknown as string)
            });
            platformBoundIndex++;
        }
    }

    return platforms;
}

async function loadPlatforms(): Promise<Stop[]> {
    const filename = fileURLToPath(import.meta.url);
    const currentDirname = dirname(filename);
    const path = join(currentDirname, "./data/platforms.csv.zlib");
    const zippedCsvPlatforms = await readFile(path);
    const csvPlatforms = inflate(zippedCsvPlatforms, { to: "string" });

    return parse(csvPlatforms, { columns: true }).toArray() as Promise<Stop[]>;
}

async function loadPlatformBounds(): Promise<{ id: string, latitude: number, longitude: number }[]> {
    const filename = fileURLToPath(import.meta.url);
    const currentDirname = dirname(filename);
    const path = join(currentDirname, "./data/platformBounds.csv.zlib");
    const zippedCsvPlatformBounds = await readFile(path);
    const csvPlatformBounds = inflate(zippedCsvPlatformBounds, { to: "string" });
    return parse(csvPlatformBounds, { columns: true }).toArray() as Promise<{ id: string, latitude: number, longitude: number }[]>;
}
