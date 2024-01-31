import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance } from "../distanceCalculator.js";
import { FilledState } from "./states.js";
import { GeoPosition, State, byProximity, isCloserThan, isGuessFor, isRouteDistance } from "./state.js";
import { UnknownState } from "./unknownState.js";

export class InitialState extends State {
    public constructor() {
        super(new Buffer(10), new DistanceCalculator(), [], []);
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
            guesses = reSeenPoints;
        }

        return new UnknownState(this.history, this.distanceCalculator, location, guesses, nearbyPlatforms);
    }
}
