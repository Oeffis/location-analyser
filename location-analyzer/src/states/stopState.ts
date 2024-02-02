import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance, StopWithDistance } from "../index.js";
import { FilledState, GeoPosition, ResultStatus, RouteState, UnknownState, isGuessFor, isRouteDistance, isStopDistance } from "./states.js";

interface StopWithAveragedDistance {
    guess: StopWithDistance;
    averagedDistance: number;
}

export class StopState extends FilledState {
    public constructor(
        fullHistory: Buffer<POIWithDistance[]>,
        history: Buffer<ResultStatus>,
        distanceCalculator: DistanceCalculator,
        location: GeoPosition,
        public readonly guesses: StopWithDistance[]
    ) {
        super(fullHistory, history, distanceCalculator, location, guesses);
    }

    public getNext(location: GeoPosition): FilledState {
        const closestPois = this.distanceCalculator.getUniquePOIsNear(location);
        this.fullHistory.append(closestPois);

        if (location.speed > this.onRouteSpeedCutoff) {
            const routes = closestPois
                .filter(isRouteDistance)
                .filter(this.directionFilter(location))
                // sort out all with distance greater than accuracy
                .filter(poi => poi.distance.value < location.accuracy * 5);

            return new RouteState(
                this.fullHistory,
                this.history,
                this.distanceCalculator,
                location,
                routes,
                routes
            );
        }

        const closestGuesses = this.getClosestStopsByAveragedDistance(closestPois.filter(isStopDistance))
            .filter(guess => guess.averagedDistance < location.accuracy * 2)
            .map(guess => guess.guess);

        if (closestGuesses.length > 0) {
            return new StopState(
                this.fullHistory,
                this.history,
                this.distanceCalculator,
                location,
                closestGuesses
            );
        }

        return new UnknownState(
            this.fullHistory,
            this.history,
            this.distanceCalculator,
            location
        );
    }

    protected getClosestStopsByAveragedDistance(rightDirectionPois: StopWithDistance[]): StopWithAveragedDistance[] {
        return (rightDirectionPois
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
            .sort((a, b) => a.averagedDistance - b.averagedDistance))
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
            }, { minDistance: Infinity, points: [] as StopWithAveragedDistance[] })
            .points;
    }
}
