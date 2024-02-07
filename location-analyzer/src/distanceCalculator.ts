import { getDistance, isPointInPolygon } from "geolib";
import { getDistanceFromLine } from "./getDistanceFromLine.js";
import { GeoPosition, Route, Stop } from "./index.js";
import { POIReference, RouteMap, RouteReference, StopReference, TransitPOI, isRouteRef } from "./routeMap.js";

export class DistanceCalculator {
    protected pois = new Map<string, TransitPOI>();
    protected routeMap = new RouteMap();

    public getUniquePOIsNear(currentLocation: GeoPosition): POIWithDistance[] {
        return this.keepClosestOfEachPoi(this.getPOIsNear(currentLocation));
    }

    public getPOIsNear(currentLocation: GeoPosition): POIWithDistance[] {
        const nearbyPOIs = this.routeMap.getPOIsAtLocation(currentLocation);
        return nearbyPOIs.map(poi => this.withDistance(currentLocation, poi));
    }

    protected keepClosestOfEachPoi(pois: POIWithDistance[]): POIWithDistance[] {
        const closestOfEachPoi = new Map<string, POIWithDistance>();
        pois.forEach(poi => {
            const currentClosest = closestOfEachPoi.get(poi.poi.id);
            if (currentClosest === undefined) {
                closestOfEachPoi.set(poi.poi.id, poi);
                return;
            }
            if (poi.distance.value < currentClosest.distance.value) {
                closestOfEachPoi.set(poi.poi.id, poi);
            }
        });
        return Array.from(closestOfEachPoi.values());
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
        this.pois = new Map(pois.map(poi => [poi.id, poi]));
    }
}

export type DistanceTypeOf<T extends TransitPOI> = T extends Route ? SectionDistance : StopDistance;

export interface WithDistance<T extends TransitPOI> { poi: T, distance: DistanceTypeOf<T> }
export type POIWithDistance = WithDistance<Stop | Route>;

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
