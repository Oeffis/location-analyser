import { getDistance, isPointInPolygon } from "geolib";
import { getDistanceFromLine } from "./getDistanceFromLine.js";
import { GeoPosition, POIReference, POISource, Route, RouteReference, Stop, StopReference, isRouteRef } from "./index.js";

export class DistanceCalculator<R extends Route, S extends Stop> {
    protected pois = new Map<string, R | S>();

    public constructor(protected dataSource: POISource<R, S>) { }

    public getUniquePOIsNear(currentLocation: GeoPosition): (WithDistance<R | S>)[] {
        return this.keepClosestOfEachPoi(this.getPOIsNear(currentLocation));
    }

    public getPOIsNear(currentLocation: GeoPosition): (WithDistance<R | S>)[] {
        const nearbyPOIs = this.dataSource.getPOIsAtLocation(currentLocation);
        return nearbyPOIs.map(poi => this.withDistance(currentLocation, poi));
    }

    protected keepClosestOfEachPoi(pois: (WithDistance<R | S>)[]): (WithDistance<R | S>)[] {
        const closestOfEachPoi = new Map<string, WithDistance<R | S>>();
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

    protected withDistance(base: GeoPosition, reference: POIReference<R, S>): WithDistance<R | S> {
        if (isRouteRef(reference)) {
            return {
                poi: reference.poi,
                distance: this.routeDistance(reference, base)
            };
        }

        return {
            poi: reference.poi,
            distance: this.stopDistance(reference, base)
        } as WithDistance<R | S>;
    }

    private routeDistance(reference: RouteReference<R>, base: GeoPosition): SectionDistance {
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

    private stopDistance(stopReference: StopReference<S>, base: GeoPosition): StopDistance {
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
}

export interface WithDistance<T extends (Route | Stop)> { poi: T, distance: T extends Route ? SectionDistance : StopDistance; }

export interface SectionDistance {
    poiId: string;
    consecutiveSection: number;
    section: number;
    value: number;
}

export interface StopDistance {
    poiId: string;
    value: number;
}
