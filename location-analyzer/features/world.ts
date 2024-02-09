import { AfterAll, BeforeAll, setWorldConstructor } from "@cucumber/cucumber";
import { assert } from "chai";
import { parse } from "csv/sync";
import { readFileSync, writeFileSync } from "fs";
import { FilledState, GeoLocation, GeoPosition, RouteMap, State, WithDistance } from "../src/index.js";
import { OsmRoute, getOsmRoutes } from "./getOsmRoutes.js";
import { OsmStop, getOsmStops } from "./getOsmStops.js";

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
    const worsenedScores = Object.keys(scores).filter(score => {
        const current = scores[parseInt(score)];
        const original = originalScores[parseInt(score)];
        if (current === undefined || original === undefined) return false;
        return current.base < original.base || current.allowingExtra < original.allowingExtra;
    });
    const improvedBaseScores = Object.keys(scores).filter(score => {
        const current = scores[parseInt(score)];
        const original = originalScores[parseInt(score)];
        if (current === undefined || original === undefined) return true;
        return current.base > original.base;
    });
    const improvedExtraScores = Object.keys(scores).filter(score => {
        const current = scores[parseInt(score)];
        const original = originalScores[parseInt(score)];
        if (current === undefined || original === undefined) return true;
        return current.allowingExtra > original.allowingExtra;
    });

    console.log("\n\n");
    if (worsenedScores.length === 0) {
        improvedBaseScores.forEach(score => {
            console.log(`🚀 Base Score of track ${score} has improved, was ${originalScores[parseInt(score)]?.base}%, is now ${scores[parseInt(score)]?.base}%`);
        });
        improvedExtraScores.forEach(score => {
            console.log(`🚀 Score allowing extra of track ${score} has improved, was ${originalScores[parseInt(score)]?.allowingExtra}%, is now ${scores[parseInt(score)]?.allowingExtra}%`);
        });
        writeFileSync("features/data/testTrackScores.json", JSON.stringify(scores, undefined, 4));
    } else {
        improvedBaseScores.forEach(score => {
            console.log(`⚔️  Base Score for track ${score} has improved, but will not be saved because tracks ${worsenedScores.join(",")} worsened. It was ${originalScores[parseInt(score)]?.base}%, is now ${scores[parseInt(score)]?.base}%.`);
        });
        improvedExtraScores.forEach(score => {
            console.log(`⚔️  Score allowing extra for track ${score} has improved, but will not be saved because tracks ${worsenedScores.join(",")} worsened. It was ${originalScores[parseInt(score)]?.allowingExtra}%, is now ${scores[parseInt(score)]?.allowingExtra}%.`);
        });
    }
});

export class LocationAnalyzerWorld {
    protected geoMap = new RouteMap<OsmRoute, OsmStop>();
    protected currentState = State.initial<OsmRoute, OsmStop>(this.geoMap);
    public expectedRoutes: Partial<OsmRoute>[] = [];
    public routeOrderMatters = true;
    public statusList: FilledState<OsmRoute, OsmStop>[] = [];
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
        this.updatePositionFromObject({
            latitude: position[0],
            longitude: position[1],
            accuracy: position[2],
            speed: position[3]
        });
    }

    protected updatePositionFromObject(position: GeoPosition | GeoLocation): void {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const accuracy = (position as GeoPosition).accuracy ?? 4;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const speed = (position as GeoPosition).speed ?? 1;

        this.statusList.push(this.currentState = this.currentState.getNext({
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy,
            speed
        }));
    }

    public updatePOIs(routes: (OsmRoute | OsmStop)[]): void {
        this.geoMap.update(routes);
    }

    public async loadOsmRoutes(): Promise<void> {
        this.updatePOIs(await getOsmRoutes());
    }

    public async loadOsmStops(): Promise<void> {
        this.updatePOIs(await getOsmStops());
    }

    public async loadAllOsmData(): Promise<void> {
        const both = await Promise.all([
            getOsmRoutes(),
            getOsmStops()
        ]);
        this.updatePOIs(both.flat());
    }

    public getFirstRoute(): OsmRoute | undefined {
        const status = this.getStatus();
        const route = status.guesses[0] as WithDistance<OsmRoute> | undefined;
        return route?.poi;
    }

    public getFirstRouteOrThrow(): OsmRoute {
        const route = this.getFirstRoute();
        assert.isDefined(route, "No route found");
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return route!;
    }

    public getStatus(): State<OsmRoute, OsmStop> {
        return this.statusList[this.statusList.length - 1] ?? this.currentState;
    }

    public getNearestPlatform(): WithDistance<OsmStop> {
        const status = this.getStatus();
        const stop = status.nearbyPlatforms[0];
        assert.isDefined(stop, "No stop found");
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return stop!;
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

export interface TrackSection extends GeoPosition {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "date-gmt": string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "date-local": string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "date-relative": string;
}
