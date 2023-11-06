import { getDistance } from "geolib";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pako from "pako";

export class LocationAnalyzer {
    private currentLocation?: GeoLocation;

    public constructor(
        private stops: Stop[]
    ) { }

    public updateLocation(location?: GeoLocation): void {
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
                distance: getDistance(currentLocation, stop.location)
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
            location: {
                latitude: Number(line.split(",")[2]),
                longitude: Number(line.split(",")[3])
            }
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
    location: GeoLocation;
}

export interface GeoLocation {
    latitude: number;
    longitude: number;
    altitude?: number;
}
