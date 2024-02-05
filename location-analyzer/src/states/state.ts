import { getDistance } from "geolib";
import { Buffer } from "../buffer.js";
import { DistanceCalculator, type POIWithDistance, type RouteWithDistance, type StopWithDistance } from "../distanceCalculator.js";
import { TransitPOI } from "../routeMap.js";
import { RouteState, StopState, UnknownState, byProximity, isGuessFor, isRouteDistance, isStopDistance, type FilledState, type GeoPosition, type NoResultStatus, type ResultStatus } from "./states.js";

export interface WithAveragedDistance<T extends POIWithDistance> {
    guess: T;
    averagedDistance: number;
}

export class State implements NoResultStatus {
    protected readonly onRouteSpeedCutoff = 3;

    protected constructor(
        protected readonly fullHistory: Buffer<POIWithDistance[]>,
        protected readonly history: Buffer<ResultStatus>,
        protected readonly distanceCalculator: DistanceCalculator,
        public readonly guesses: POIWithDistance[]
    ) {
    }

    public getNext(location: GeoPosition): FilledState {
        const closestPois = this.distanceCalculator
            .getUniquePOIsNear(location)
            .filter(this.directionFilter(location));
        this.fullHistory.append(closestPois);

        const possibleRoutes = this.getPossibleRoutes(closestPois, location);

        if (possibleRoutes.length > 0) {
            return this.makeRouteState(location, possibleRoutes);
        }

        const possibleStops = this.getPossibleStops(closestPois, location);
        if (possibleStops.length > 0) {
            return this.makeStopState(location, possibleStops);
        }

        return this.createUnknownState(location);
    }

    protected createUnknownState(location: GeoPosition): FilledState {
        return new UnknownState(
            this.fullHistory,
            this.history,
            this.distanceCalculator,
            location
        );
    }

    protected makeStopState(location: GeoPosition, possibleStops: StopWithDistance[]): FilledState {
        return new StopState(
            this.fullHistory,
            this.history,
            this.distanceCalculator,
            location,
            possibleStops
        );
    }

    protected makeRouteState(location: GeoPosition, possibleRoutes: RouteWithDistance[]): FilledState {
        return new RouteState(
            this.fullHistory,
            this.history,
            this.distanceCalculator,
            location,
            possibleRoutes,
            possibleRoutes
        );
    }

    protected getPossibleRoutes(closestPois: POIWithDistance[], location: GeoPosition): RouteWithDistance[] {
        if (location.speed < this.onRouteSpeedCutoff) {
            return [];
        }

        const closesRoutes = this.getClosestByAveragedDistance(closestPois);

        return closesRoutes
            .map(guess => guess.guess)
            .filter(isRouteDistance);
    }

    protected getPossibleStops(closestPois: POIWithDistance[], location: GeoPosition): StopWithDistance[] {
        const closestStopsByAveraged = this.getClosestByAveragedDistance(closestPois);
        const stops = closestStopsByAveraged
            .filter(guess => guess.averagedDistance < location.accuracy / 2)
            .map(guess => guess.guess)
            .filter(isStopDistance);
        return stops;
    }

    protected directionFilter(currentLocation: GeoPosition): (poi: POIWithDistance) => boolean {
        return (poi: POIWithDistance) => {
            if (isStopDistance(poi)) return true;
            const lastLocation = this.history[0]?.location;
            if (lastLocation === undefined) return true;

            const lastPoi = this.fullHistory
                .last()
                ?.find(isGuessFor(poi.poi)) as RouteWithDistance | undefined;

            if (lastPoi === undefined) return true;

            const atSameSection = poi.distance.section === lastPoi.distance.section;
            if (atSameSection) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const sectionEnd = poi.poi.sections[poi.distance.consecutiveSection]![poi.distance.section + 1]!;
                const lastDistanceToSectionEnd = getDistance(lastLocation, sectionEnd);
                const currentDistanceToSectionEnd = getDistance(currentLocation, sectionEnd);
                const wrongDirectionDistance = currentDistanceToSectionEnd - lastDistanceToSectionEnd;
                const gracedWrongDirectionDistance = wrongDirectionDistance - currentLocation.accuracy - lastLocation.accuracy;
                return gracedWrongDirectionDistance < 0;
            }

            return poi.distance.section > lastPoi.distance.section;
        };
    }

    protected getNearbyPlatformsIn(pois: POIWithDistance[]): StopWithDistance[] {
        return pois
            .filter(isStopDistance)
            .sort(byProximity);
    }

    protected getClosestByAveragedDistance<T extends POIWithDistance>(rightDirectionPois: T[]): WithAveragedDistance<T>[] {
        return rightDirectionPois
            .map(guess => {
                const currentDistance = guess.distance.value;
                const history = this.fullHistory;
                const previousDistance = history[history.length - 1]?.find(isGuessFor(guess.poi))?.distance.value ?? currentDistance;
                const prePreviousDistance = history[history.length - 2]?.find(isGuessFor(guess.poi))?.distance.value ?? previousDistance;
                const averagedDistance = (currentDistance + previousDistance + prePreviousDistance) / 3;
                return {
                    guess,
                    averagedDistance
                };
            })
            .reduce((acc, guess) => {
                if (acc.minDistance < guess.averagedDistance) return acc;
                if (acc.minDistance === guess.averagedDistance) {
                    acc.points.push(guess);
                    return acc;
                }
                return {
                    minDistance: guess.averagedDistance,
                    points: [guess]
                };
            }, { minDistance: Infinity, points: [] as WithAveragedDistance<T>[] })
            .points;
    }

    public updatePOIs(pois: TransitPOI[]): this {
        this.distanceCalculator.updatePOIs(pois);
        return this;
    }

    public get nearbyPlatforms(): StopWithDistance[] {
        return [];
    }

    public static initial(pois: TransitPOI[] = []): State {
        return new State(
            new Buffer(10),
            new Buffer(10),
            new DistanceCalculator(),
            []
        ).updatePOIs(pois);
    }
}
