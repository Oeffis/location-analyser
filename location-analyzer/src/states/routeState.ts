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
        nearbyPlatforms: StopWithDistance[]
    ) {
        super(fullHistory, history, distanceCalculator, location, guesses, nearbyPlatforms);
    }

    public getNext(location: GeoPosition): FilledState {
        const guessIds = this.guesses.map(guess => guess.poi.id);
        const closestPois = this.distanceCalculator.getUniquePOIsNear(location);
        this.fullHistory.append(closestPois);
        const lastGuessesWithDistance = closestPois
            .filter(isRouteDistance)
            .filter(poi => guessIds.includes(poi.poi.id));
        const closestDistance = Math.min(...lastGuessesWithDistance.map(poi => poi.distance.value));

        if (closestDistance < 1000 && location.speed > this.onRouteSpeedCutoff) {
            const closestGuesses = lastGuessesWithDistance.reduce<RouteWithDistance[]>((acc, guess) => {
                if (guess.distance.value > closestDistance) return acc;
                acc.push(guess);
                return acc;
            }, []);

            return new RouteState(
                this.fullHistory,
                this.history,
                this.distanceCalculator,
                location,
                closestGuesses,
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
                this.nearbyPlatforms
            );
        }

        return super.getNext(location);
    }
}
