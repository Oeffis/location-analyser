import { Stop } from "@oeffis/location-analyzer";
import { readFile } from "fs/promises";
import { inflate } from "pako";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export async function getVrrStops(): Promise<Stop[]> {
    const filename = fileURLToPath(import.meta.url);
    const currentDirname = dirname(filename);
    const path = join(currentDirname, "./data/stops.csv.pako");
    const zippedCSVStopps = await readFile(path);
    const csvStopps = inflate(zippedCSVStopps, { to: "string" });
    const lines = csvStopps.split("\n");
    const stopLines = lines.slice(1);
    return stopLines.map(lineToStop);
}

function lineToStop(line: string): Stop {
    return {
        id: line.split(",")[0],
        location: {
            latitude: Number(line.split(",")[2]),
            longitude: Number(line.split(",")[3])
        }
    };
}
