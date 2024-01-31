import { getDistance } from "geolib";
import { Buffer } from "../buffer.js";
import { DistanceCalculator, type POIWithDistance, type RouteWithDistance, type StopWithDistance } from "../distanceCalculator.js";
import { TransitPOI, isRoute } from "../routeMap.js";
import { type FilledState } from "./filledState.js";

export abstract class State implements NoResultStatus {

    protected constructor(
        protected readonly history: Buffer<ResultStatus>,
        protected readonly distanceCalculator = new DistanceCalculator(),
        public readonly guesses: POIWithDistance[],
        public readonly nearbyPlatforms: StopWithDistance[]
    ) {
    }

    public abstract getNext(location: GeoPosition): FilledState;

    protected getRightDirectionPois(currentLocation: GeoPosition): POIWithDistance[] {
        return this.distanceCalculator
            .getUniquePOIsNear(currentLocation)
            .filter(this.directionFilter(currentLocation));
    }

    protected directionFilter(currentLocation: GeoPosition): (poi: POIWithDistance) => boolean {
        if (!isResultStatus(this)) return () => true;

        const previousLocations = this.history.map(status => status.location);
        const locationHistory = [...previousLocations, currentLocation];

        return new MatchingDirectionFilter(
            locationHistory,
            this.distanceCalculator.getUniquePOIsNear(this.location)
        ).asFunction();
    }

    protected getNearbyPlatformsIn(pois: POIWithDistance[]): StopWithDistance[] {
        return pois
            .filter(isStopDistance)
            .sort(byProximity);
    }

    protected keepClosestOfEachPoi(pois: POIWithDistance[]): POIWithDistance[] {
        const closestOfEachPoi = new Map<string, POIWithDistance>();
        pois.forEach(poi => {
            const currentClosest = closestOfEachPoi.get(poi.poi.id);
            const isCloser = !currentClosest || poi.distance.value < currentClosest.distance.value;
            if (isCloser) closestOfEachPoi.set(poi.poi.id, poi);

        });
        return Array.from(closestOfEachPoi.values());
    }

    public updatePOIs(pois: TransitPOI[]): void {
        this.distanceCalculator.updatePOIs(pois);
    }
}

class MatchingDirectionFilter {
    protected readonly currentLocation: GeoPosition | undefined;
    protected readonly lastLocation: GeoPosition | undefined;

    public constructor(
        protected readonly locationHistory: GeoPosition[],
        protected readonly lastPoisWithDistance: POIWithDistance[]
    ) {
        this.currentLocation = locationHistory[locationHistory.length - 1];
        this.lastLocation = locationHistory[locationHistory.length - 2];
    }

    public asFunction(): (poi: POIWithDistance) => boolean {
        return this.apply.bind(this);
    }

    protected apply(poi: POIWithDistance): boolean {
        if (isStopDistance(poi)) return true;
        if (this.currentLocation === undefined) return true;
        if (this.lastLocation === undefined) return true;

        const lastPoi = this.lastPoisWithDistance
            .find(lastPoi => lastPoi.poi.id === poi.poi.id) as RouteWithDistance | undefined;
        if (lastPoi === undefined) return true;

        const atSameSection = poi.distance.section === lastPoi.distance.section;
        if (atSameSection) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const sectionEnd = poi.poi.sections[poi.distance.consecutiveSection]![poi.distance.section + 1]!;
            const lastDistanceToSectionEnd = getDistance(this.lastLocation, sectionEnd);
            const currentDistanceToSectionEnd = getDistance(this.currentLocation, sectionEnd);
            const wrongDirectionDistance = currentDistanceToSectionEnd - lastDistanceToSectionEnd;
            const gracedWrongDirectionDistance = wrongDirectionDistance - this.currentLocation.accuracy - this.lastLocation.accuracy;
            return gracedWrongDirectionDistance < 0;
        }

        return poi.distance.section > lastPoi.distance.section;
    }
}

export function byProximity(a: POIWithDistance, b: POIWithDistance): number {
    return a.distance.value - b.distance.value;
}

export function isCloserThan(maxDistance: number): (poi: POIWithDistance) => boolean {
    return poi => poi.distance.value <= maxDistance;
}

export function isGuessFor(poi: TransitPOI): (guess: POIWithDistance) => boolean {
    return guess => guess.poi.id === poi.id;
}

export function isRouteDistance(poi: POIWithDistance): poi is RouteWithDistance {
    return isRoute(poi.poi);
}

export function isStopDistance(poi: POIWithDistance): poi is StopWithDistance {
    return !isRoute(poi.poi);
}

export function isResultStatus(status: Status): status is ResultStatus {
    return Object.hasOwn(status, "location");
}

export type Status = NoResultStatus | ResultStatus;

export type NoResultStatus = Omit<ResultStatus, "location">;

export interface ResultStatus {
    location: GeoPosition;
    guesses: POIWithDistance[];
    nearbyPlatforms: StopWithDistance[];
}

export interface Stop {
    id: string;
    name: string;
    boundaries: GeoLocation[];
}

export interface GeoPosition extends GeoLocation {
    accuracy: number;
    speed: number;
}

export interface GeoLocation {
    latitude: number;
    longitude: number;
    altitude?: number;
}

export interface Route {
    id: string;
    from: string;
    to: string;
    ref: string;
    sections: Section[][];
}

export interface Section {
    routeId: string;
    consecutiveSection: number;
    sequence: number;
    lat: number;
    lon: number;
}
