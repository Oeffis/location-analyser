import { Given, Then, When } from "@cucumber/cucumber";
import { assert } from "chai";
import { stringify } from "csv/sync";
import { writeFileSync } from "fs";
import { computeDestinationPoint } from "geolib";
import { WithDistance, isRouteDistance, isStopDistance } from "../../src/index.js";
import { OsmRoute } from "../getOsmRoutes.js";
import { OsmStop } from "../getOsmStops.js";
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
    checkTrack.call(this, data);
});

Then<LocationAnalyzerWorld>("there are {int} pois left", function (amount: number) {
    const status = this.getStatus();
    assert.equal(status.guesses.length, amount, `Expected ${amount} pois, but got ${status.guesses.length}`);
});

type Direction = "north" | "east" | "south" | "west";

function checkTrack(this: LocationAnalyzerWorld, data: RawDataTable): void {
    assert.equal(this.statusList.length, this.track.length);

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
    const output = [];

    for (let trackIndex = 0; trackIndex < this.track.length; trackIndex++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const trackSection = this.track[trackIndex]!;
        const status = this.statusList[trackIndex] ?? { guesses: [] as WithDistance<OsmRoute | OsmStop>[] };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const expected = expectedRules.filter(rule => rule.startTime! <= trackSection["date-local"].slice(11, 19)! && rule.endTime! >= trackSection["date-local"].slice(11, 19)!);
        const noneExpected = expected.some(rule => rule.vehicleOrStop === "none");
        if (noneExpected && expected.length > 1) {
            throw new Error("You can't have 'none' and other rules at the same time");
        }

        const matched = status.guesses.filter(guess => {
            if (isStopDistance<OsmRoute, OsmStop>(guess)) {
                return expected.some(rule => rule.vehicleOrStop === `${guess.poi.name} (${guess.poi.id})`);
            }
            if (isRouteDistance<OsmRoute, OsmStop>(guess)) {
                const actualString = `${guess.poi.ref} - '${guess.poi.from}' => '${guess.poi.to}' (${guess.poi.id})`;
                return expected.some(rule => rule.vehicleOrStop === actualString);
            }
        });

        let allMatched = false;
        if (!noneExpected) {
            allMatched = matched.length === expected.length && status.guesses.length === expected.length;
        } else {
            allMatched = status.guesses.length === 0;
        }
        if (allMatched) {
            correct++;
        } else {
            wrong++;
        }

        let allowingExtraCorrect = false;
        if (!noneExpected) {
            allowingExtraCorrect = matched.length === expected.length;
        } else {
            allowingExtraCorrect = status.guesses.length === 0;
        }
        if (allowingExtraCorrect) {
            correctAllowingExtra++;
        } else {
            wrongAllowingExtra++;
        }

        output.push({
            correct: allMatched ? "✅" : "❌",
            allowingExtra: allowingExtraCorrect ? "✅" : "❌",
            // eslint-disable-next-line @typescript-eslint/naming-convention
            "date-local": trackSection["date-local"].slice(11, 19),
            latitude: trackSection.latitude,
            longitude: trackSection.longitude,
            result: status.guesses.map(guess => {
                if (isStopDistance<OsmRoute, OsmStop>(guess)) {
                    return guess.poi.name + " (" + guess.poi.id + ")";
                }
                if (isRouteDistance<OsmRoute, OsmStop>(guess)) {
                    return `${guess.poi.ref} - '${guess.poi.from}' => '${guess.poi.to}' (${guess.poi.id})`;
                }
            }).join(", ") || "none",
            expected: expected.map(rule => rule.vehicleOrStop).join(", ") || "no expectations"
        });
    }

    writeFileSync(`features/data/testTrack${this.usedTrack}Results.csv`, stringify(output, { header: true }));

    const score = parseFloat((correct * 100 / (correct + wrong)).toFixed(2));
    const scoreAllowingExtra = parseFloat((correctAllowingExtra * 100 / (correctAllowingExtra + wrongAllowingExtra)).toFixed(2));

    const previousScores = this.getScore();

    this.updateScore({ base: score, allowingExtra: scoreAllowingExtra });
    assert.isAtLeast(score, previousScores.base, `Score has declined, was ${previousScores.base}%, is now ${score}%`);
    assert.isAtLeast(scoreAllowingExtra, previousScores.allowingExtra, `Score allowing extra has declined, was ${previousScores.allowingExtra}%, is now ${scoreAllowingExtra}%`);
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
