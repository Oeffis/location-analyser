import { Buffer } from "../buffer.js";
import { DistanceCalculator, RouteWithDistance, StopWithDistance } from "../distanceCalculator.js";
import { FilledState, GeoPosition, ResultStatus, isRouteDistance } from "./states.js";

export class RouteState extends FilledState implements ResultStatus {
    public constructor(
        history: Buffer<ResultStatus>,
        distanceCalculator: DistanceCalculator,
        location: GeoPosition,
        public readonly guesses: RouteWithDistance[],
        nearbyPlatforms: StopWithDistance[]
    ) {
        super(history, distanceCalculator, location, guesses, nearbyPlatforms);
    }

    public getNext(location: GeoPosition): FilledState {
        const guessIds = this.guesses.map(guess => guess.poi.id);
        const closestPois = this.distanceCalculator.getUniquePOIsNear(location);
        const lastGuessesWithDistance = closestPois
            .filter(isRouteDistance)
            .filter(poi => guessIds.includes(poi.poi.id));
        const closestDistance = Math.min(...lastGuessesWithDistance.map(poi => poi.distance.value));

        if (closestDistance < 1000 && location.speed > 2) {
            const closestGuesses = lastGuessesWithDistance.reduce<RouteWithDistance[]>((acc, guess) => {
                if (guess.distance.value > closestDistance) return acc;
                acc.push(guess);
                return acc;
            }, []);

            return new RouteState(
                this.history,
                this.distanceCalculator,
                location,
                closestGuesses,
                this.nearbyPlatforms
            );
        }

        return super.getNext(location);
    }
}
