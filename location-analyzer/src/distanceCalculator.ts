import { getDistance, isPointInPolygon, isPointNearLine } from "geolib";
import { getDistanceFromLine } from "./getDistanceFromLine.js";
import { GeoPosition, Route, Stop } from "./locationAnalyzer.js";
import { POIReference, RouteMap, RouteReference, StopReference, TransitPOI, isRouteRef } from "./routeMap.js";

export class DistanceCalculator {
    protected routeMap = new RouteMap();

    public getPOIsAt(currentLocation: GeoPosition): POIWithDistance[] {
        const nearbyPOIs = this.routeMap.getPOIsAtLocation(currentLocation);
        return nearbyPOIs.map(poi => this.withDistance(currentLocation, poi));
    }

    protected withDistance(base: GeoPosition, reference: POIReference): POIWithDistance {
        if (isRouteRef(reference)) {
            return {
                poi: reference.poi,
                distance: this.routeDistance(reference, base)
            };
        }

        return {
            poi: reference.poi,
            distance: this.stopDistance(reference, base)
        };
    }

    private routeDistance(reference: RouteReference, base: GeoPosition): SectionDistance {
        const start = reference.start;
        const end = reference.end;
        const distance = getDistanceFromLine(base, {
            lat: start.latitude,
            lon: start.longitude
        }, {
            lat: end.latitude,
            lon: end.longitude
        }, 0.1);

        return {
            poiId: reference.poi.id,
            consecutiveSection: reference.consecutiveSection,
            section: reference.section,
            value: distance
        };
    }

    private stopDistance(stopReference: StopReference, base: GeoPosition): StopDistance {
        let distance: number;
        if (isPointInPolygon(base, stopReference.poi.boundaries)) {
            distance = 0;
        } else if (stopReference.end === undefined) {
            distance = getDistance(base, stopReference.start, 0.1);
        } else {
            distance = getDistanceFromLine(base, {
                lat: stopReference.start.latitude,
                lon: stopReference.start.longitude
            }, {
                lat: stopReference.end.latitude,
                lon: stopReference.end.longitude
            }, 0.1);
        }

        if (isNaN(distance)) {
            throw new Error("distance is NaN");
        }

        return {
            poiId: stopReference.poi.id,
            value: distance
        };
    }

    public updatePOIs(pois: TransitPOI[]): void {
        this.routeMap.update(pois);
    }
}

export type DistanceTypeOf<T extends TransitPOI> = T extends Route ? SectionDistance : StopDistance;

export type POIWithDistance = StopWithDistance | RouteWithDistance;

export interface StopWithDistance {
    poi: Stop;
    distance: StopDistance;
}

export interface RouteWithDistance {
    poi: Route;
    distance: SectionDistance;
}

interface SectionDistance {
    poiId: string;
    consecutiveSection: number;
    section: number;
    value: number;
}

interface StopDistance {
    poiId: string;
    value: number;
}
