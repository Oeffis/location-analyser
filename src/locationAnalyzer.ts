import { readFileSync } from "node:fs";
import { join } from "node:path";
import pako from "pako";

export class LocationAnalyzer {
    private currentLocation?: [number, number];

    public constructor(
        private stops: Stop[]
    ) { }

    protected distance(a: [number, number], b: [number, number]): number {
        const [x1, y1] = a;
        const [x2, y2] = b;
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }

    public updateLocation(location: [number, number]): void {
        this.currentLocation = location;
    }

    public getStatus(): Status {
        const currentLocation = this.currentLocation;
        if (!currentLocation) {
            return {
                stops: []
            };
        }

        const sortedStops = this.stops
            .map(stop => ({
                id: stop.id,
                distance: this.distance(currentLocation, stop.location)
            }))
            .sort((a, b) => a.distance - b.distance);
        return { stops: sortedStops };
    }

    public static forVRR(): LocationAnalyzer {
        const zippedCSVStopps = readFileSync(join(__dirname, "./data/stops.csv.pako"));
        const csvStopps = pako.inflate(zippedCSVStopps, { to: "string" });
        const lines = csvStopps.split("\n");
        const stopLines = lines.slice(1);
        const stops = stopLines.map(line => ({
            id: line.split(",")[0],
            parent: line.split(",")[1],
            location: [Number(line.split(",")[2]), Number(line.split(",")[3])]
        } as Stop));
        return new LocationAnalyzer(stops);
    }
}

export interface Status {
    stops: {
        id: string;
        distance: number;
    }[];
}

export interface Stop {
    id: string;
    parent: string;
    location: [number, number];
}
