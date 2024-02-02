import { getDistance } from "geolib";
import { Buffer } from "../buffer.js";
import { type DistanceCalculator, type POIWithDistance, type RouteWithDistance, type StopWithDistance } from "../distanceCalculator.js";
import { TransitPOI } from "../routeMap.js";
import { byProximity, isGuessFor, isResultStatus, isRouteDistance, isStopDistance, type FilledState, type GeoPosition, type NoResultStatus, type ResultStatus } from "./states.js";

export abstract class State implements NoResultStatus {
    protected readonly onRouteSpeedCutoff = 3;

    protected constructor(
        protected readonly fullHistory: Buffer<POIWithDistance[]>,
        protected readonly history: Buffer<ResultStatus>,
        protected readonly distanceCalculator: DistanceCalculator,
        public readonly guesses: POIWithDistance[],
        public readonly nearbyPlatforms: StopWithDistance[]
    ) {
    }

    public abstract getNext(location: GeoPosition): FilledState;

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

    protected getClosestByCumulatedDistance<T extends POIWithDistance>(rightDirectionPois: T[], location: GeoPosition): T[] {
        return (rightDirectionPois
            .map(guess => {
                const currentDistance = guess.distance.value;
                if (isRouteDistance(guess)) {
                    const previousDistance = this.history.last()?.guesses.find(isGuessFor(guess.poi))?.distance.value;
                    const prePreviousDistance = this.history[this.history.length - 2]?.guesses.find(isGuessFor(guess.poi))?.distance.value;
                    if (previousDistance === undefined || prePreviousDistance === undefined) return undefined;
                    const cumulatedDistance = currentDistance + previousDistance + prePreviousDistance;
                    if (cumulatedDistance / 5 > location.accuracy) return undefined;
                    return {
                        guess,
                        cumulatedDistance
                    };
                }
                if (location.speed > 2) return undefined;
                const previousDistance = this.history.last()?.nearbyPlatforms.find(isGuessFor(guess.poi))?.distance.value;
                const prePreviousDistance = this.history[this.history.length - 2]?.nearbyPlatforms.find(isGuessFor(guess.poi))?.distance.value;
                if (previousDistance === undefined || prePreviousDistance === undefined) return undefined;
                const cumulatedDistance = currentDistance + previousDistance + prePreviousDistance;
                if (cumulatedDistance / 3 > location.accuracy) return undefined;
                return {
                    guess,
                    cumulatedDistance
                } as { guess: T; cumulatedDistance: number; };
            })
            .filter((guess): guess is { guess: T; cumulatedDistance: number; } => guess !== undefined)
            .sort((a, b) => a.cumulatedDistance - b.cumulatedDistance))
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
            }, { minDistance: Infinity, points: [] as T[] })
            .points;
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
