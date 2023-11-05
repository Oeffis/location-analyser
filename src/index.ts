import { readFileSync } from "fs";
import pako from "pako";
import { join } from "path";

const zippedCSVStopps = readFileSync(join(__dirname, "./data/stops.csv.pako"));
const csvStopps = pako.inflate(zippedCSVStopps, { to: "string" });
const lines = csvStopps.split("\n");
const stopLines = lines.slice(1);
const stops = stopLines.map(line => ({
    id: line.split(",")[0],
    parent: line.split(",")[1],
    location: [Number(line.split(",")[2]), Number(line.split(",")[3])]
} as Stop));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getStatus(location: [number, number], _options: StatusOptions = defaultStatusOptions): Status {
    const sortedStops = stops
        .map(stop => ({
            id: stop.id,
            distance: distance(location, stop.location)
        }))
        // .filter(stop => stop.distance < options.maxDistance)
        .sort((a, b) => a.distance - b.distance);
    return { stops: sortedStops };
}

const defaultStatusOptions: StatusOptions = {
    cutoff: 100,
    maxDistance: 1000
};

export function distance(a: [number, number], b: [number, number]): number {
    const [x1, y1] = a;
    const [x2, y2] = b;
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

export interface Status {
    stops: {
        id: string;
        distance: number;
    }[];
}

interface Stop {
    id: string;
    parent: string;
    location: [number, number];
}

export interface StatusOptions {
    cutoff: number;
    maxDistance: number;
}
