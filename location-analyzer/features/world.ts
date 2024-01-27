import { setWorldConstructor } from "@cucumber/cucumber";
import { GeoLocation, GeoPosition, LocationAnalyzer, Route, Status } from "../src/locationAnalyzer.js";

type Coords = CoordPair | CoordPairWithAccuracy | GeoPosition | GeoLocation;
type CoordPair = [number, number];
type CoordPairWithAccuracy = [number, number, number];

export class LocationAnalyzerWorld {
    public locationAnalyzer: LocationAnalyzer = new LocationAnalyzer();
    public expectedRoutes: Partial<Route>[] = [];
    public routeOrderMatters = true;
    public statusList: Status[] = [];
    public track: GeoPosition[] = [];

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
}

setWorldConstructor(LocationAnalyzerWorld);

function isLocationPosition(position: GeoPosition | GeoLocation): position is GeoPosition {
    return Object.hasOwn(position, "accuracy");
}
