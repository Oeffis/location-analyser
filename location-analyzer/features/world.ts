import { AfterAll, BeforeAll, setWorldConstructor } from "@cucumber/cucumber";
import { assert } from "chai";
import { parse } from "csv/sync";
import { readFileSync, writeFileSync } from "fs";
import { RouteWithDistance, StopWithDistance } from "../src/distanceCalculator.js";
import { GeoLocation, GeoPosition, LocationAnalyzer, ResultStatus, Route, Status } from "../src/locationAnalyzer.js";
import { TransitPOI } from "../src/routeMap.js";
import { getVrrRoutes } from "./getVrrRoutes.js";
import { getVrrStops } from "./getVrrStops.js";

type Coords = CoordPair | CoordPairWithAccuracyAndSpeed | GeoPosition | GeoLocation;
type CoordPair = [number, number];
type CoordPairWithAccuracyAndSpeed = [number, number, number, number];

interface TrackScores {
    base: number;
    allowingExtra: number;
}

let originalScores: Record<number, TrackScores>;
let scores: Record<number, TrackScores>;

BeforeAll(function () {
    try {
        const file = readFileSync("features/data/testTrackScores.json", { encoding: "utf-8" });
        originalScores = JSON.parse(file) as Record<number, TrackScores>;
    } catch {
        originalScores = {};
    }
    scores = { ...originalScores };
});

AfterAll(function () {
    // if all scores are better than the previous ones, write them to the file
    const allBetter = Object.keys(scores).every(score => {
        const current = scores[parseInt(score)];
        const original = originalScores[parseInt(score)];
        if (current === undefined || original === undefined) return true;
        return current.base > original.base && current.allowingExtra > original.allowingExtra;
    });
    if (allBetter) {
        writeFileSync("features/data/testTrackScores.json", JSON.stringify(scores, undefined, 4));
    }
});

const postRunMessages: string[] = [];
AfterAll(function () {
    if (postRunMessages.length === 0) return;

    console.log("\n\n");
    console.log("Post-run messages:");
    for (const message of postRunMessages) {
        console.log(message);
    }
});

export class LocationAnalyzerWorld {
    protected locationAnalyzer: LocationAnalyzer = new LocationAnalyzer();
    public expectedRoutes: Partial<Route>[] = [];
    public routeOrderMatters = true;
    public statusList: ResultStatus[] = [];
    public track: TrackSection[] = [];
    public usedTrack?: number;

    public updatePosition(...positions: Coords[]): void {
        for (const position of positions) {
            if (Array.isArray(position)) {
                this.updatePositionFromArray(position);
            } else {
                this.updatePositionFromObject(position);
            }
        }
    }

    protected updatePositionFromArray(position: CoordPair | CoordPairWithAccuracyAndSpeed): void {
        const status = this.locationAnalyzer.updatePosition({
            latitude: position[0],
            longitude: position[1],
            accuracy: position[2] ?? 4,
            speed: position[3] ?? 1
        });
        this.statusList.push(status);
    }

    protected updatePositionFromObject(position: GeoPosition | GeoLocation): void {
        const coords: CoordPair = [position.latitude, position.longitude];
        if (isLocationPosition(position)) {
            coords.push(position.accuracy);
            coords.push(position.speed);
        }
        this.updatePositionFromArray(coords);
    }

    public updatePOIs(routes: TransitPOI[]): void {
        this.locationAnalyzer.updatePOIs(routes);
    }

    public async loadVrrRoutes(): Promise<void> {
        this.updatePOIs(await getVrrRoutes());
    }

    public async loadVrrStops(): Promise<void> {
        this.updatePOIs(await getVrrStops());
    }

    public async loadAllVrrData(): Promise<void> {
        const both = await Promise.all([
            getVrrRoutes(),
            getVrrStops()
        ]);
        this.updatePOIs(both.flat());
    }

    public getFirstRoute(): Route {
        const status = this.getStatus();
        const route = status.guesses[0] as RouteWithDistance;
        assert.exists(route, "There is no route to check against.");
        return route.poi;
    }

    public getStatus(): Status {
        return this.statusList[this.statusList.length - 1] ?? this.locationAnalyzer.getStatus();
    }

    public getNearestPlatform(): StopWithDistance {
        const status = this.getStatus();
        const stop = status.nearbyPlatforms[0];
        assert.isDefined(stop, "No stop found");
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return stop!;
    }

    public postRunLog(...messages: string[]): void {
        postRunMessages.push(...messages);
    }

    public simulateTrack(trackNumber: number): void {
        this.usedTrack = trackNumber;
        const data = readFileSync(`features/data/testTrack${trackNumber}.csv`);
        this.track = parse(data, { columns: true, delimiter: ";" }) as TrackSection[];

        this.updatePosition(...this.track);
    }

    public getScore(): TrackScores {
        const trackNumber = this.usedTrack;
        if (trackNumber === undefined) throw new Error("No track was simulated");
        return scores[trackNumber] ?? { base: 0, allowingExtra: 0 };
    }

    public updateScore(score: TrackScores): void {
        const trackNumber = this.usedTrack;
        if (trackNumber === undefined) throw new Error("No track was simulated");
        scores[trackNumber] = score;
    }
}

setWorldConstructor(LocationAnalyzerWorld);

function isLocationPosition(position: GeoPosition | GeoLocation): position is GeoPosition {
    return Object.hasOwn(position, "accuracy");
}

export interface TrackSection extends GeoPosition {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "date-gmt": string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "date-local": string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "date-relative": string;
}
