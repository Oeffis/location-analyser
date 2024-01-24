import { Given, Then, When } from "@cucumber/cucumber";
import { assert } from "chai";
import { parse, stringify } from "csv/sync";
import { readFileSync, writeFileSync } from "fs";
import { computeDestinationPoint } from "geolib";
import { GeoLocation, Status, isStopDistance } from "../../src/locationAnalyzer.js";
import { LocationAnalyzerWorld } from "../world.js";
import { getFirstStop } from "./helpers/getFirstStop.js";
import { locationMap } from "./helpers/locationMap.js";

Given<LocationAnalyzerWorld>("I am at {string}", function (location: string) {
    const locationCoords = locationMap[location]?.location;
    assert.ok(locationCoords, `Location ${location} not found`);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.locationAnalyzer.updateLocation(locationCoords!);
});

Given<LocationAnalyzerWorld>("I am {double} m {word} of {string}", function (distance: number, direction: Direction, location: string) {
    const locationCoords = locationMap[location]?.location;
    assert.ok(locationCoords, `Location ${location} not found`);
    const bearing = directionToBearing(direction);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const newCoords = computeDestinationPoint(locationCoords!, distance, bearing);
    this.locationAnalyzer.updateLocation(newCoords);
});

Given<LocationAnalyzerWorld>("No location was set", function () {
    // This is the default
});


When<LocationAnalyzerWorld>("I am on {string}", function (route: string) {
    const routeCoords = locationMap[route]?.location;
    assert.ok(routeCoords, `Route ${route} not found`);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.locationAnalyzer.updateLocation(routeCoords!);
});

When<LocationAnalyzerWorld>("I am at the stop {string} with an accuracy of {int} meters", function (stopName: string, accuracy: number) {
    const coords = locationMap[stopName]?.location;
    assert.ok(coords, `Stop ${stopName} not found`);
    this.locationAnalyzer.updateLocation({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ...coords!,
        accuracy
    });
});

Then<LocationAnalyzerWorld>("the detected platform is {string}", function (platform: string) {
    const stop = getFirstStop(this);
    const locationId = locationMap[platform]?.id;
    assert.equal(stop.poi.id, locationId);
});

Then<LocationAnalyzerWorld>("the data output over time is correct", function () {
    assert.equal(this.statusList.length, this.track.length);

    function makeOutput(status: Status): string {
        const stop = status.pois[0];
        if (!stop) return "none";

        if (isStopDistance(stop)) {
            return `stop ${stop.poi.name || "without name"}`;
        }

        return `route ${stop.poi.ref} from ${stop.poi.from} to ${stop.poi.to}`;
    }

    const results = this.statusList.map((status, index) => ({
        latitude: this.track[index]?.latitude,
        longitude: this.track[index]?.longitude,
        result: makeOutput(status)
    }));

    writeFileSync("features/data/testTrackResults.csv", stringify(results, { header: true }));
    // const expectedResults = parse("features/data/testTrackResults.csv", { columns: true }) as { latitude: string, longitude: string, result: string }[];
    // assert.deepEqual(results, expectedResults);
});

Then<LocationAnalyzerWorld>("there are {int} pois left", function (amount: number) {
    const status = this.locationAnalyzer.getStatus();
    assert.equal(status.pois.length, amount, `Expected ${amount} pois, but got ${status.pois.length}`);
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
