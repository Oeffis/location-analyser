import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance, StopWithDistance } from "../distanceCalculator.js";
import { RouteState } from "../index.js";
import { GeoPosition, ResultStatus, State, byProximity, isCloserThan, isGuessFor, isRouteDistance } from "./states.js";

export class FilledState extends State implements ResultStatus {
    public constructor(
        history: Buffer<ResultStatus>,
        distanceCalculator: DistanceCalculator,
        public readonly location: GeoPosition,
        public readonly guesses: POIWithDistance[],
        public readonly nearbyPlatforms: StopWithDistance[]
    ) {
        super(history, distanceCalculator, guesses, nearbyPlatforms);
        this.history.append(this);
    }

    public getNext(location: GeoPosition): FilledState {
        const rightDirectionPois = this.getRightDirectionPois(location);
        const uniqueRightDirectionPois = this.keepClosestOfEachPoi(rightDirectionPois);
        const nearbyPlatforms = this.getNearbyPlatformsIn(uniqueRightDirectionPois);

        const intermediate = uniqueRightDirectionPois
            .map(guess => {
                const currentDistance = guess.distance.value;
                if (isRouteDistance(guess)) {
                    const previousDistance = this.history.last()?.guesses.find(isGuessFor(guess.poi))?.distance.value;
                    const prePreviousDistance = this.history[this.history.length - 2]?.guesses.find(isGuessFor(guess.poi))?.distance.value;
                    if (previousDistance === undefined || prePreviousDistance === undefined) return undefined;
                    const cumulatedDistance = currentDistance + previousDistance + prePreviousDistance;
                    if (cumulatedDistance / 10 > location.accuracy) return undefined;
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
                } as { guess: POIWithDistance, cumulatedDistance: number };
            })
            .filter((guess): guess is { guess: POIWithDistance, cumulatedDistance: number } => guess !== undefined)
            .sort((a, b) => a.cumulatedDistance - b.cumulatedDistance);

        const reSeenPoints = intermediate
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

        let guesses = uniqueRightDirectionPois
            .filter(isCloserThan(location.accuracy))
            .sort(byProximity);

        if (reSeenPoints.length > 0) {
            if (reSeenPoints.every(isRouteDistance)) {
                return new RouteState(this.history, this.distanceCalculator, location, reSeenPoints, nearbyPlatforms);
            }
            guesses = reSeenPoints;
        }

        return new FilledState(this.history, this.distanceCalculator, location, guesses, nearbyPlatforms);
    }
}
