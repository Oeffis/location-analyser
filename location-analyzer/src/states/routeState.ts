import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance, RouteWithDistance, StopWithDistance } from "../distanceCalculator.js";
import { FilledState, GeoPosition, ResultStatus, isGuessFor, isRouteDistance } from "./states.js";

export class RouteState extends FilledState implements ResultStatus {
    public constructor(
        fullHistory: Buffer<POIWithDistance[]>,
        history: Buffer<ResultStatus>,
        distanceCalculator: DistanceCalculator,
        location: GeoPosition,
        public readonly guesses: RouteWithDistance[],
        protected readonly possibilities: RouteWithDistance[],
        nearbyPlatforms: StopWithDistance[]
    ) {
        super(fullHistory, history, distanceCalculator, location, guesses, nearbyPlatforms);
    }

    public getNext(location: GeoPosition): FilledState {
        const closestPois = this.distanceCalculator.getUniquePOIsNear(location);
        this.fullHistory.append(closestPois);

        if (location.speed > this.onRouteSpeedCutoff) {
            const possibilityIds = this.possibilities.map(possibility => possibility.poi.id);
            const rightDirectionRoutes = closestPois
                .filter(isRouteDistance)
                .filter(this.directionFilter(location))
                .filter(poi => possibilityIds.includes(poi.poi.id));

            const closest = this.getClosestRoutesByCumulatedDistance(rightDirectionRoutes);

            return new RouteState(
                this.fullHistory,
                this.history,
                this.distanceCalculator,
                location,
                closest,
                this.possibilities,
                this.nearbyPlatforms
            );
        }

        const rightDirectionPois = closestPois.filter(this.directionFilter(location));
        const closestByCumulation = this.getClosestByCumulatedDistance(rightDirectionPois, location);
        const guessesInCloses = this.guesses.filter(guess => closestByCumulation.find(isGuessFor(guess.poi)));
        if (guessesInCloses.length > 0) {
            return new RouteState(
                this.fullHistory,
                this.history,
                this.distanceCalculator,
                location,
                guessesInCloses,
                this.possibilities,
                this.nearbyPlatforms
            );
        }

        return super.getNext(location);
    }

    protected getClosestRoutesByCumulatedDistance(rightDirectionPois: RouteWithDistance[]): RouteWithDistance[] {
        return (rightDirectionPois
            .map(guess => {
                const currentDistance = guess.distance.value;
                const history = this.fullHistory;
                const previousDistance = history[history.length - 1]?.find(isGuessFor(guess.poi))?.distance.value ?? currentDistance;
                const prePreviousDistance = history[history.length - 2]?.find(isGuessFor(guess.poi))?.distance.value ?? previousDistance;
                const cumulatedDistance = currentDistance + previousDistance + prePreviousDistance;
                return {
                    guess,
                    cumulatedDistance
                };
            })
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
            }, { minDistance: Infinity, points: [] as RouteWithDistance[] })
            .points;
    }
}
