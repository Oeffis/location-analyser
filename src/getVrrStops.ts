import { readFile } from "fs/promises";
import { Stop } from "locationAnalyzer";
import pako from "pako";
import { join } from "path";

export async function getVrrStops(): Promise<Stop[]> {
    const zippedCSVStopps = await readFile(join(__dirname, "./data/stops.csv.pako"));
    const csvStopps = pako.inflate(zippedCSVStopps, { to: "string" });
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
