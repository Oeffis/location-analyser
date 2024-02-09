import { getDistance } from "geolib";
import { Buffer } from "../buffer.js";
import { DistanceCalculator, WithDistance } from "../distanceCalculator.js";
import { Route, RouteState, Stop, StopState, UnknownState, byProximity, isGuessFor, isRouteDistance, isStopDistance, type FilledState, type GeoPosition } from "./states.js";

export interface WithAveragedDistance<R extends Route, S extends Stop, T extends WithDistance<R | S>> {
    guess: T;
    averagedDistance: number;
}

export class State<R extends Route, S extends Stop> {
    protected readonly onRouteSpeedCutoff = 3;

    protected constructor(
        protected readonly fullHistory: Buffer<WithDistance<R | S>[]>,
        protected readonly history: Buffer<FilledState<R, S>>,
        protected readonly distanceCalculator: DistanceCalculator<R, S>,
        public readonly guesses: (WithDistance<R | S>)[]
    ) {
    }

    public getNext(location: GeoPosition): FilledState<R, S> {
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

    protected createUnknownState(location: GeoPosition): FilledState<R, S> {
        return new UnknownState(
            this.fullHistory,
            this.history,
            this.distanceCalculator,
            location
        );
    }

    protected makeStopState(location: GeoPosition, possibleStops: WithDistance<S>[]): FilledState<R, S> {
        return new StopState(
            this.fullHistory,
            this.history,
            this.distanceCalculator,
            location,
            possibleStops
        );
    }

    protected makeRouteState(location: GeoPosition, possibleRoutes: WithDistance<R>[]): FilledState<R, S> {
        return new RouteState(
            this.fullHistory,
            this.history,
            this.distanceCalculator,
            location,
            possibleRoutes,
            possibleRoutes
        );
    }

    protected getPossibleRoutes(closestPois: WithDistance<R | S>[], location: GeoPosition): WithDistance<R>[] {
        if (location.speed < this.onRouteSpeedCutoff) {
            return [];
        }

        return this.getClosestByAveragedDistance(closestPois)
            .map(guess => guess.guess)
            .filter(isRouteDistance) as WithDistance<R>[];
    }

    protected getPossibleStops(closestPois: WithDistance<R | S>[], location: GeoPosition): WithDistance<S>[] {
        return this.getClosestByAveragedDistance(closestPois)
            .filter(guess => guess.averagedDistance < location.accuracy / 2)
            .map(guess => guess.guess)
            .filter(isStopDistance) as WithDistance<S>[];
    }

    protected directionFilter(currentLocation: GeoPosition): (poi: WithDistance<R | S>) => boolean {
        return (poi: WithDistance<R | S>) => {
            if (!isRouteDistance(poi)) return true;
            const lastLocation = this.history[0]?.location;
            if (lastLocation === undefined) return true;

            const lastPoi = this.fullHistory
                .last()
                ?.find(isGuessFor(poi.poi)) as WithDistance<Route> | undefined;

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

    protected getNearbyPlatformsIn(pois: (WithDistance<R | S>)[]): WithDistance<S>[] {
        return pois
            .filter(isStopDistance)
            .sort(byProximity) as WithDistance<S>[];
    }

    protected getClosestByAveragedDistance<T extends WithDistance<R | S>>(rightDirectionPois: T[]): WithAveragedDistance<R, S, T>[] {
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
            }, { minDistance: Infinity, points: [] as WithAveragedDistance<R, S, T>[] })
            .points;
    }

    public updatePOIs(pois: (R | S)[]): this {
        this.distanceCalculator.updatePOIs(pois);
        return this;
    }

    public get nearbyPlatforms(): WithDistance<S>[] {
        return [];
    }

    public static initial<R extends Route, S extends Stop>(pois: (R | S)[] = []): State<R, S> {
        return new State(
            new Buffer(10),
            new Buffer<FilledState<R, S>>(10),
            new DistanceCalculator(),
            []
        ).updatePOIs(pois);
    }
}
