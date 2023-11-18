import { readFile } from "fs/promises";
import { inflate } from "pako";
import { join } from "path";
import { Stop } from "../src/locationAnalyzer";

export async function getVrrStops(): Promise<Stop[]> {
    const path = join(__dirname, "./data/stops.csv.pako");
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
