
import { Given } from "@cucumber/cucumber";
import assert from "assert";
import { computeDestinationPoint } from "geolib";
import { GeoLocation } from "locationAnalyzer";
import { LocationAnalyzerWorld } from "../world";

const locationMap: Record<string, GeoLocation> = {
    /* eslint-disable @typescript-eslint/naming-convention */
    "GE Westfälische Hochschule": {
        latitude: 51.5747889,
        longitude: 7.0311586
    },
    "Gelsenkirchen Hbf": {
        latitude: 51.5049259,
        longitude: 7.1022064
    }
    /* eslint-enable @typescript-eslint/naming-convention */
};

Given<LocationAnalyzerWorld>("I am at {string}", function (location: string) {
    const locationCoords = locationMap[location];
    assert.ok(locationCoords, `Location ${location} not found`);
    this.locationAnalyzer.updateLocation(locationCoords);
});

Given<LocationAnalyzerWorld>("I am {double} m {word} of {string}", function (distance: number, direction: Direction, location: string) {
    const locationCoords = locationMap[location];
    const bearing = directionToBearing(direction);
    const newCoords = computeDestinationPoint(locationCoords, distance, bearing);
    this.locationAnalyzer.updateLocation(newCoords);
});

Given<LocationAnalyzerWorld>("No location was set", function () {
    this.locationAnalyzer.updateLocation(undefined);
});

type Direction = "north" | "east" | "south" | "west";
function directionToBearing(direction: Direction): number {
    const directionToBearingMap = {
        north: 0,
        east: 90,
        south: 180,
        west: 270
    };
    assert.ok(directionToBearingMap[direction]);
    return directionToBearingMap[direction];
}
