import { getDistance } from "geolib";
import { Buffer } from "./buffer.js";
import { DistanceCalculator, POIWithDistance, RouteWithDistance, StopWithDistance } from "./distanceCalculator.js";
import { TransitPOI, isRoute } from "./routeMap.js";

export class LocationAnalyzer {
    protected readonly historyLimit = 10;
    protected readonly history = new Buffer<ResultStatus>(this.historyLimit);
    protected readonly distanceCalculator = new DistanceCalculator();

    public constructor(pois: TransitPOI[] = []) {
        this.updatePOIs(pois);
    }

    public updatePOIs(pois: TransitPOI[]): void {
        this.distanceCalculator.updatePOIs(pois);

        const status = this.getStatus();
        isResultStatus(status) && this.updatePosition(status.location);
    }

    public getStatus(): Status {
        return this.history.last() ?? {
            guesses: [],
            nearbyPlatforms: []
        };
    }

    public updatePosition(location: GeoPosition): ResultStatus {
        return this.history.append(this.getNextStatus(location));
    }

    private getNextStatus(location: GeoPosition): ResultStatus {
        const rightDirectionPois = this.getRightDirectionPois(location);
        const uniqueRightDirectionPois = this.keepClosestOfEachPoi(rightDirectionPois);
        const nearbyPlatforms = this.getNearbyPlatformsIn(uniqueRightDirectionPois);
        const closePoints = uniqueRightDirectionPois
            .filter(isCloserThan(location.accuracy))
            .sort(byProximity);

        const reSeenPoints = uniqueRightDirectionPois
            .map(guess => {
                const currentDistance = guess.distance.value;
                const previousDistance = this.history.last()?.guesses.find(isGuessFor(guess.poi))?.distance.value;
                const prePreviousDistance = this.history[this.history.length - 2]?.guesses.find(isGuessFor(guess.poi))?.distance.value;
                if (previousDistance === undefined || prePreviousDistance === undefined) return undefined;

                const cumulatedDistance = currentDistance + previousDistance + prePreviousDistance;
                return {
                    guess,
                    cumulatedDistance
                };
            })
            .filter((guess): guess is { guess: POIWithDistance, cumulatedDistance: number } => guess !== undefined)
            .sort((a, b) => a.cumulatedDistance - b.cumulatedDistance)
            .reduce((acc, guess) => {
                if (acc.minDistance < guess.cumulatedDistance) return acc;
                if (acc.minDistance === guess.cumulatedDistance) {
                    acc.points.push(guess.guess);
                    return acc;
                }
                return {
                    minDistance: guess.cumulatedDistance,
                    points: [guess.guess]
                };
            }, { minDistance: Infinity, points: [] as POIWithDistance[] })
            .points;

        let guesses = closePoints;
        if (reSeenPoints.length > 0) {
            guesses = reSeenPoints;
        }

        const status = {
            location,
            guesses,
            nearbyPlatforms
        };
        return status;
    }

    protected getRightDirectionPois(currentLocation: GeoPosition): POIWithDistance[] {
        return this.distanceCalculator
            .getUniquePOIsNear(currentLocation)
            .filter(this.directionFilter(currentLocation));
    }

    protected directionFilter(currentLocation: GeoPosition): (poi: POIWithDistance) => boolean {
        const status = this.getStatus();
        if (!isResultStatus(status)) return () => true;

        const previousLocations = this.history.map(status => status.location);
        const locationHistory = [...previousLocations, currentLocation];

        return new MatchingDirectionFilter(
            locationHistory,
            this.distanceCalculator.getUniquePOIsNear(status.location)
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

function byProximity(a: POIWithDistance, b: POIWithDistance): number {
    return a.distance.value - b.distance.value;
}

function isCloserThan(maxDistance: number): (poi: POIWithDistance) => boolean {
    return poi => poi.distance.value <= maxDistance;
}

function isGuessFor(poi: TransitPOI): (guess: POIWithDistance) => boolean {
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
