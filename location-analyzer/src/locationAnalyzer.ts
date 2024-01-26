import { getDistance } from "geolib";
import { DistanceCalculator, POIWithDistance, RouteWithDistance, StopWithDistance } from "./distanceCalculator.js";
import { TransitPOI, isRoute } from "./routeMap.js";

export class LocationAnalyzer {
    protected status?: Status;
    protected readonly bufferLimit = 10;
    protected statusHistory: Status[] = [];
    protected locationHistory: GeoPosition[] = [];
    protected readonly distanceCalculator = new DistanceCalculator();

    public constructor(
        pois: TransitPOI[] = [],
    ) {
        this.updatePOIs(pois);
    }

    public updatePosition(location: GeoPosition): void {
        this.locationHistory.push(location);
        if (this.locationHistory.length > this.bufferLimit) {
            this.locationHistory.shift();
        }
        this.invalidateStatus();
    }

    protected invalidateStatus(): void {
        this.status = undefined;
    }

    public getStatus(): Status {
        this.status = this.status ?? this.calculateStatus();
        return this.status;
    }

    protected calculateStatus(): Status {
        const location = this.locationHistory[this.locationHistory.length - 1];
        if (location === undefined) { return { guesses: [], nearbyPlatforms: [] }; }

        const poisWithDistance = this.distanceCalculator.getPOIsAt(location);
        const closestOfEachPoi = this.keepClosestOfEachPoi(poisWithDistance);
        const rightDirectionPois = this.filterWrongDirectionPois(closestOfEachPoi);
        const nearbyPlatforms = rightDirectionPois
            .filter(isStopDistance)
            .sort((a, b) => a.distance.value - b.distance.value);
        const closePoints = rightDirectionPois
            .filter(poi => poi.distance.value < location.accuracy)
            .sort((a, b) => a.distance.value - b.distance.value);

        const last = this.statusHistory[this.statusHistory.length - 1];
        const reSeenPoints = rightDirectionPois.filter(poi => last?.guesses.find(lastGuess => lastGuess.poi.id === poi.poi.id));

        let guesses = closePoints;
        if (reSeenPoints.length > 0) {
            guesses = reSeenPoints;
        }

        const status = {
            location,
            guesses,
            nearbyPlatforms
        };
        this.updateStatusHistory(status);
        return status;
    }

    protected filterWrongDirectionPois(pois: POIWithDistance[]): POIWithDistance[] {
        const currentLocation = this.locationHistory[this.locationHistory.length - 1];
        const lastLocation = this.locationHistory[this.locationHistory.length - 2];
        if (lastLocation === undefined) {
            return pois;
        }
        let lastPoisWithDistance: POIWithDistance[] = [];
        lastPoisWithDistance = this.distanceCalculator.getPOIsAt(lastLocation);
        lastPoisWithDistance = this.keepClosestOfEachPoi(lastPoisWithDistance);
        return pois.filter(isStopOrRightDirection);

        function isStopOrRightDirection(poi: POIWithDistance): boolean {
            if (isStopDistance(poi)) return true;
            if (currentLocation === undefined) return true;
            if (lastLocation === undefined) return true;

            const lastPoi = lastPoisWithDistance
                .find(lastPoi => lastPoi.poi.id === poi.poi.id) as RouteWithDistance | undefined;
            if (lastPoi === undefined) return true;

            const atSameSection = poi.distance.section === lastPoi.distance.section;
            if (atSameSection) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const sectionEnd = poi.poi.sections[poi.distance.consecutiveSection]![poi.distance.section + 1]!;
                const lastDistanceToSectionEnd = getDistance(lastLocation, sectionEnd);
                const currentDistanceToSectionEnd = getDistance(currentLocation, sectionEnd);
                return currentDistanceToSectionEnd <= lastDistanceToSectionEnd;
            }

            return poi.distance.section > lastPoi.distance.section;
        }
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

    protected updateStatusHistory(status: Status): void {
        this.statusHistory.push(status);
        if (this.statusHistory.length > this.bufferLimit) {
            this.statusHistory.shift();
        }
    }

    public updatePOIs(pois: TransitPOI[]): void {
        this.distanceCalculator.updatePOIs(pois);
        this.invalidateStatus();
    }
}

export function isRouteDistance(poi: POIWithDistance): poi is RouteWithDistance {
    return isRoute(poi.poi);
}

export function isStopDistance(poi: POIWithDistance): poi is StopWithDistance {
    return !isRoute(poi.poi);
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
