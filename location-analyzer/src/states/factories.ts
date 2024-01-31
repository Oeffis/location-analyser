
import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance, RouteWithDistance, StopWithDistance } from "../distanceCalculator.js";
import { FilledState, GeoPosition, ResultStatus, RouteState, StopState, UnknownState } from "./states.js";

type StateType = "route" | "stop" | "unknown" | "filled";

export function createState(
    key: StateType,
    history: Buffer<ResultStatus>,
    distanceCalculator: DistanceCalculator,
    location: GeoPosition,
    guesses: POIWithDistance[],
    nearbyPlatforms: StopWithDistance[]
): FilledState {
    switch (key) {
        case "route":
            return new RouteState(history, distanceCalculator, location, guesses as RouteWithDistance[], nearbyPlatforms);
        case "stop":
            return new StopState(history, distanceCalculator, location, guesses, nearbyPlatforms);
        case "unknown":
            return new UnknownState(history, distanceCalculator, location, nearbyPlatforms);
        case "filled":
            return new FilledState(history, distanceCalculator, location, guesses, nearbyPlatforms);
    }
}
