import { Given, Then, When } from "@cucumber/cucumber";
import { assert } from "chai";
import { parse, stringify } from "csv/sync";
import { readFileSync, writeFileSync } from "fs";
import { computeDestinationPoint } from "geolib";
import { GeoPosition, ResultStatus, Status, isStopDistance } from "../../src/locationAnalyzer.js";
import { LocationAnalyzerWorld } from "../world.js";
import { locationMap } from "./helpers/locationMap.js";

interface RawDataTable { rawTable: string[][] }

Given<LocationAnalyzerWorld>("I am at {string}", function (location: string) {
    const locationCoords = locationMap[location]?.location;
    assert.ok(locationCoords, `Location ${location} not found`);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.updatePosition(locationCoords!);
});

Given<LocationAnalyzerWorld>("I am {double} m {word} of {string}", function (distance: number, direction: Direction, location: string) {
    const locationCoords = locationMap[location]?.location;
    assert.ok(locationCoords, `Location ${location} not found`);
    const bearing = directionToBearing(direction);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const newCoords = computeDestinationPoint(locationCoords!, distance, bearing);
    this.updatePosition(newCoords);
});

Given<LocationAnalyzerWorld>("No location was set", function () {
    // This is the default
});


Given<LocationAnalyzerWorld>("I travel on the 302 from Kennedyplatz to Musiktheater station", function () {
    this.updatePosition(
        [51.514508, 7.094044, 4.812899933984365],
        [51.514396, 7.094069, 4.957418141995718],
        [51.514294, 7.094151, 4.907870088336124],
        [51.514199, 7.094208, 4.920214836943836],
        [51.514103, 7.094183, 4.952843315613497],
        [51.514017, 7.094110, 5.070647214274187],
        [51.513944, 7.093981, 5.234951602323192],
        [51.513901, 7.093805, 5.316365399732025],
        [51.513856, 7.093599, 5.364008192562383],
        [51.513810, 7.093411, 5.376993644666365],
        [51.513748, 7.093218, 5.316263817510434],
        [51.513711, 7.093010, 5.524452298816627],
        [51.513666, 7.092854, 5.74273035940015],
        [51.513619, 7.092694, 5.912747952604428]
    );
});

When<LocationAnalyzerWorld>("I am on {string}", function (route: string) {
    const routeCoords = locationMap[route]?.location;
    assert.ok(routeCoords, `Route ${route} not found`);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.updatePosition(routeCoords!);
});

When<LocationAnalyzerWorld>("I am at the stop {string} with an accuracy of {int} meters", function (stopName: string, accuracy: number) {
    const coords = locationMap[stopName]?.location;
    assert.ok(coords, `Stop ${stopName} not found`);
    this.updatePosition({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ...coords!,
        accuracy
    });
});

When<LocationAnalyzerWorld>("the GPS glitches so my next position is at the bus stop", function () {
    this.updatePosition([51.513659, 7.092553, 5.214622950041441]);
});

When<LocationAnalyzerWorld>("my next positions are back on the track", function () {
    this.updatePosition([51.513563, 7.092461, 4.921717638301804], [51.513493, 7.092314, 4.830296054452409]);
});

Then<LocationAnalyzerWorld>("the following vehicles and stops should be detected", function (data: RawDataTable) {
    assert.equal(this.statusList.length, this.track.length);
    printSimulationResults(this.statusList, this.track);

    const expectedValues = data.rawTable.slice(1).map(row => {
        const startTime = row[0];
    });

});

Then<LocationAnalyzerWorld>("there are {int} pois left", function (amount: number) {
    const status = this.getStatus();
    assert.equal(status.guesses.length, amount, `Expected ${amount} pois, but got ${status.guesses.length}`);
});

type Direction = "north" | "east" | "south" | "west";

function printSimulationResults(statusList: ResultStatus[], track: GeoPosition[]): void {
    function makeOutput(status: Status): string {
        if (status.guesses.length === 0) return "none";

        return status.guesses.map(poi => {
            if (isStopDistance(poi)) {
                return `stop ${poi.poi.name || "without name"}`;
            }

            return `route ${poi.poi.ref} from ${poi.poi.from} to ${poi.poi.to}`;
        }).join(", ");
    }

    const results = statusList.map((status, index) => ({
        latitude: track[index]?.latitude,
        longitude: track[index]?.longitude,
        result: makeOutput(status)
    }));

    writeFileSync("features/data/testTrackResults.csv", stringify(results, { header: true }));
}

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
