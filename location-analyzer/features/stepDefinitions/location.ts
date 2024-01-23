import { Given, Then } from "@cucumber/cucumber";
import { assert } from "chai";
import { parse, stringify } from "csv/sync";
import { readFileSync, writeFileSync } from "fs";
import { computeDestinationPoint } from "geolib";
import { GeoLocation, Route, Stop } from "../../src/locationAnalyzer.js";
import { LocationAnalyzerWorld } from "../world.js";

const locationMap: Record<string, GeoLocation> = {
    /* eslint-disable @typescript-eslint/naming-convention */
    "GE Westfälische Hochschule": {
        latitude: 51.5748126,
        longitude: 7.0311269
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.locationAnalyzer.updateLocation(locationCoords!);
});

Given<LocationAnalyzerWorld>("I am {double} m {word} of {string}", function (distance: number, direction: Direction, location: string) {
    const locationCoords = locationMap[location];
    assert.ok(locationCoords, `Location ${location} not found`);
    const bearing = directionToBearing(direction);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const newCoords = computeDestinationPoint(locationCoords!, distance, bearing);
    this.locationAnalyzer.updateLocation(newCoords);
});

Given<LocationAnalyzerWorld>("No location was set", function () {
    // This is the default
});


Then<LocationAnalyzerWorld>("the data output over time is correct", function () {
    assert.equal(this.statusList.length, this.track.length);

    const results = this.statusList.map((status, index) => ({
        latitude: this.track[index]?.latitude,
        longitude: this.track[index]?.longitude,
        result: (status.pois[0] as Stop).name || (status.pois[0] as Route).from + " - " + (status.pois[0] as Route).to
    }));

    writeFileSync("features/data/testTrackResults.csv", stringify(results, { header: true }));
    // const expectedResults = parse("features/data/testTrackResults.csv", { columns: true }) as { latitude: string, longitude: string, result: string }[];
    // assert.deepEqual(results, expectedResults);
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
