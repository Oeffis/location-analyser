import { Buffer } from "../buffer.js";
import { POIWithDistance, StopWithDistance } from "../distanceCalculator.js";
import { GeoPosition, ResultStatus, Status, byProximity, isCloserThan, isGuessFor, isRouteDistance } from "../locationAnalyzer.js";
import { State } from "./state.js";
import { UnknownState } from "./unknownState.js";

export abstract class FilledState extends State implements ResultStatus {
    public constructor(
        public readonly location: GeoPosition,
        public readonly guesses: POIWithDistance[],
        public readonly nearbyPlatforms: StopWithDistance[]
    ) {
        super(guesses, nearbyPlatforms);
    }

    public getNext(location: GeoPosition, uniqueRightDirectionPois: POIWithDistance[], history: Buffer<Status>, nearbyPlatforms: StopWithDistance[]): FilledState {
        const intermediate = uniqueRightDirectionPois
            .map(guess => {
                const currentDistance = guess.distance.value;
                if (isRouteDistance(guess)) {
                    const previousDistance = history.last()?.guesses.find(isGuessFor(guess.poi))?.distance.value;
                    const prePreviousDistance = history[history.length - 2]?.guesses.find(isGuessFor(guess.poi))?.distance.value;
                    if (previousDistance === undefined || prePreviousDistance === undefined) return undefined;
                    const cumulatedDistance = currentDistance + previousDistance + prePreviousDistance;
                    if (cumulatedDistance / 10 > location.accuracy) return undefined;
                    return {
                        guess,
                        cumulatedDistance
                    };
                }
                if (location.speed > 2) return undefined;
                const previousDistance = history.last()?.nearbyPlatforms.find(isGuessFor(guess.poi))?.distance.value;
                const prePreviousDistance = history[history.length - 2]?.nearbyPlatforms.find(isGuessFor(guess.poi))?.distance.value;
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

        return new UnknownState(location, guesses, nearbyPlatforms);
    }
}
