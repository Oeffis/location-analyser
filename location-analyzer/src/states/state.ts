import { Buffer } from "../buffer.js";
import { POIWithDistance, StopWithDistance } from "../distanceCalculator.js";
import { GeoPosition, NoResultStatus, Status } from "../locationAnalyzer.js";
import { type FilledState } from "./filledState.js";

export abstract class State implements NoResultStatus {
    protected constructor(
        public readonly guesses: POIWithDistance[],
        public readonly nearbyPlatforms: StopWithDistance[]
    ) { }

    public abstract getNext(location: GeoPosition, uniqueRightDirectionPois: POIWithDistance[], history: Buffer<Status>, nearbyPlatforms: StopWithDistance[]): FilledState;
}
