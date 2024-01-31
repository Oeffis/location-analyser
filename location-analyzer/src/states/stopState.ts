import { Buffer } from "../buffer.js";
import { DistanceCalculator, StopWithDistance } from "../index.js";
import { FilledState, GeoPosition, ResultStatus, isStopDistance } from "./states.js";

export class StopState extends FilledState {
    public constructor(
        history: Buffer<ResultStatus>,
        distanceCalculator: DistanceCalculator,
        location: GeoPosition,
        public readonly guesses: StopWithDistance[],
        nearbyPlatforms: StopWithDistance[]
    ) {
        super(history, distanceCalculator, location, guesses, nearbyPlatforms);
    }

    public getNext(location: GeoPosition): FilledState {
        const guessIds = this.guesses.map(guess => guess.poi.id);
        const closestPois = this.distanceCalculator.getUniquePOIsNear(location);
        const lastGuessesWithDistance = closestPois
            .filter(isStopDistance)
            .filter(poi => guessIds.includes(poi.poi.id));
        const closestDistance = Math.min(...lastGuessesWithDistance.map(poi => poi.distance.value));

        if (closestDistance < 10 && location.speed < 2) {
            const closestGuesses = lastGuessesWithDistance.reduce<StopWithDistance[]>((acc, guess) => {
                if (guess.distance.value > closestDistance) return acc;
                acc.push(guess);
                return acc;
            }, []);

            return new StopState(
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
