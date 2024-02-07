import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance, WithDistance } from "../index.js";
import { FilledState, GeoPosition, Stop } from "./states.js";

export class StopState extends FilledState {
    public constructor(
        fullHistory: Buffer<POIWithDistance[]>,
        history: Buffer<FilledState>,
        distanceCalculator: DistanceCalculator,
        location: GeoPosition,
        public readonly guesses: WithDistance<Stop>[]
    ) {
        super(fullHistory, history, distanceCalculator, location, guesses);
        if (guesses.length === 0) throw new Error("StopState needs at least one guess");
    }
}
