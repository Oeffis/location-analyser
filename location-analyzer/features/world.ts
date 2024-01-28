import { setWorldConstructor } from "@cucumber/cucumber";
import { assert } from "chai";
import { RouteWithDistance, StopWithDistance } from "../src/distanceCalculator.js";
import { GeoLocation, GeoPosition, LocationAnalyzer, ResultStatus, Route, Status } from "../src/locationAnalyzer.js";
import { TransitPOI } from "../src/routeMap.js";
import { getVrrRoutes } from "./getVrrRoutes.js";
import { getVrrStops } from "./getVrrStops.js";

type Coords = CoordPair | CoordPairWithAccuracy | GeoPosition | GeoLocation;
type CoordPair = [number, number];
type CoordPairWithAccuracy = [number, number, number];

export class LocationAnalyzerWorld {
    protected locationAnalyzer: LocationAnalyzer = new LocationAnalyzer();
    public expectedRoutes: Partial<Route>[] = [];
    public routeOrderMatters = true;
    public statusList: ResultStatus[] = [];
    public track: TrackSection[] = [];

    public updatePosition(...positions: Coords[]): void {
        for (const position of positions) {
            if (Array.isArray(position)) {
                this.updatePositionFromArray(position);
            } else {
                this.updatePositionFromObject(position);
            }
        }
    }

    protected updatePositionFromArray(position: CoordPair | CoordPairWithAccuracy): void {
        const status = this.locationAnalyzer.updatePosition({
            latitude: position[0],
            longitude: position[1],
            accuracy: position[2] ?? 4
        });
        this.statusList.push(status);
    }

    protected updatePositionFromObject(position: GeoPosition | GeoLocation): void {
        const coords: CoordPair = [position.latitude, position.longitude];
        if (isLocationPosition(position)) {
            coords.push(position.accuracy);
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
