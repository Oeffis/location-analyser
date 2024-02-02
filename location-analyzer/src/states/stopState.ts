import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance, StopWithDistance } from "../index.js";
import { FilledState, GeoPosition, ResultStatus, RouteState, isRouteDistance, isStopDistance } from "./states.js";

export class StopState extends FilledState {
    public constructor(
        fullHistory: Buffer<POIWithDistance[]>,
        history: Buffer<ResultStatus>,
        distanceCalculator: DistanceCalculator,
        location: GeoPosition,
        public readonly guesses: StopWithDistance[],
        nearbyPlatforms: StopWithDistance[]
    ) {
        super(fullHistory, history, distanceCalculator, location, guesses, nearbyPlatforms);
    }

    public getNext(location: GeoPosition): FilledState {
        const guessIds = this.guesses.map(guess => guess.poi.id);
        const closestPois = this.distanceCalculator.getUniquePOIsNear(location);
        this.fullHistory.append(closestPois);
        const lastGuessesWithDistance = closestPois
            .filter(isStopDistance)
            .filter(poi => guessIds.includes(poi.poi.id));
        const closestDistance = Math.min(...lastGuessesWithDistance.map(poi => poi.distance.value));

        if (closestDistance < 25 && location.speed < this.onRouteSpeedCutoff) {
            const closestGuesses = lastGuessesWithDistance.reduce<StopWithDistance[]>((acc, guess) => {
                if (guess.distance.value > closestDistance) return acc;
                acc.push(guess);
                return acc;
            }, []);

            return new StopState(
                this.fullHistory,
                this.history,
                this.distanceCalculator,
                location,
                closestGuesses,
                this.nearbyPlatforms
            );
        }

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
                routes,
                this.nearbyPlatforms
            );
        }

        return super.getNext(location);
    }
}
