import { Given, Then, When } from "@cucumber/cucumber";
import { assert } from "chai";
import { parse, stringify } from "csv/sync";
import { readFileSync, writeFileSync } from "fs";
import { computeDestinationPoint } from "geolib";
import { GeoPosition, ResultStatus, Status, isStopDistance } from "../../src/locationAnalyzer.js";
import { LocationAnalyzerWorld, TrackSection } from "../world.js";
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
        [51.514508, 7.094044, 4.812899933984365, 8.180849070785564],
        [51.514396, 7.094069, 4.957418141995718, 6.308941214474703],
        [51.514294, 7.094151, 4.907870088336124, 3.670283429614399],
        [51.514199, 7.094208, 4.920214836943836, 3.284260471545796],
        [51.514103, 7.094183, 4.952843315613497, 3.568375460114761],
        [51.514017, 7.094110, 5.070647214274187, 3.677073404926226],
        [51.513944, 7.093981, 5.234951602323192, 3.504573848340516],
        [51.513901, 7.093805, 5.316365399732025, 3.651059708806524],
        [51.513856, 7.093599, 5.364008192562383, 3.992251528906538],
        [51.513810, 7.093411, 5.376993644666365, 4.62662842644044],
        [51.513748, 7.093218, 5.316263817510434, 5.354333768023042],
        [51.513711, 7.093010, 5.524452298816627, 6.897409100128991],
        [51.513666, 7.092854, 5.74273035940015, 7.373476782253835],
        [51.513619, 7.092694, 5.912747952604428, 7.41369291405825]
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
    this.updatePosition([51.513659, 7.092553, 5.214622950041441, 6.278923608727162]);
});

When<LocationAnalyzerWorld>("my next positions are back on the track", function () {
    this.updatePosition([51.513563, 7.092461, 4.921717638301804, 4.339772856822002], [51.513493, 7.092314, 4.830296054452409, 0.4396880335849978]);
});

Then<LocationAnalyzerWorld>("the following vehicles and stops should be detected", function (data: RawDataTable) {
    assert.equal(this.statusList.length, this.track.length);
    printSimulationResults(this.statusList, this.track);

    const expectedRules = data.rawTable.slice(1).map(row => {
        const startTime = row[0];
        const endTime = row[1];
        const vehicleOrStop = row[2];
        return { startTime, endTime, vehicleOrStop };
    });

    let correct = 0;
    let wrong = 0;
    let correctAllowingExtra = 0;
    let wrongAllowingExtra = 0;

    for (let trackIndex = 0; trackIndex < this.track.length; trackIndex++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const trackSection = this.track[trackIndex]!;
        const status = this.statusList[trackIndex] ?? { guesses: [] };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const expected = expectedRules.filter(rule => rule.startTime! <= trackSection["date-local"].slice(11, 19)! && rule.endTime! >= trackSection["date-local"].slice(11, 19)!);
        if (expected.length === 0) continue;

        const matched = status.guesses.filter(guess => {
            if (isStopDistance(guess)) {
                return expected.some(rule => rule.vehicleOrStop === guess.poi.name);
            }
            const targetString = `${guess.poi.ref} - '${guess.poi.from}' => '${guess.poi.to}'`;
            return expected.some(rule => rule.vehicleOrStop === targetString);
        });

        if (matched.length === status.guesses.length) {
            correct++;
        } else {
            wrong++;
        }

        if (matched.length === expected.length) {
            correctAllowingExtra++;
        } else {
            wrongAllowingExtra++;
        }
    }

    const score = parseFloat((correct * 100 / (correct + wrong)).toFixed(2));
    const scoreAllowingExtra = parseFloat((correctAllowingExtra * 100 / (correctAllowingExtra + wrongAllowingExtra)).toFixed(2));

    let previousScores: { base: number, allowingExtra: number };
    try {
        const file = readFileSync("features/data/testTrackScores.json", { encoding: "utf-8" });
        previousScores = JSON.parse(file) as { base: number, allowingExtra: number };
    } catch {
        previousScores = { base: 0, allowingExtra: 0 };
    }

    assert.isAtLeast(score, previousScores.base, `Score has declined, was ${previousScores.base}%, is now ${score}%`);
    assert.isAtLeast(scoreAllowingExtra, previousScores.allowingExtra, `Score allowing extra has declined, was ${previousScores.allowingExtra}%, is now ${scoreAllowingExtra}%`);

    if (score > previousScores.base) {
        this.postRunLog(`🚀 Score has improved, was ${previousScores.base}%, is now ${score}%`);
    }
    if (scoreAllowingExtra > previousScores.allowingExtra) {
        this.postRunLog(`🚀 Score allowing extra has improved, was ${previousScores.allowingExtra}%, is now ${scoreAllowingExtra}%`);
    }

    writeFileSync("features/data/testTrackScores.json", JSON.stringify({ base: score, allowingExtra: scoreAllowingExtra }));

    // console.log(`Score is ${score}% (${correct} correct, ${wrong} wrong)`);
    // console.log(`Score including extra is ${scoreIncludingExtra}% (${correctIncludingExtra} correct, ${wrongIncludingExtra} wrong)`);
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
