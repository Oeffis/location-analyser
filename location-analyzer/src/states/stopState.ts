import { Buffer } from "../buffer.js";
import { DistanceCalculator, WithDistance } from "../index.js";
import { FilledState, GeoPosition, Route, Stop } from "./states.js";

export class StopState<R extends Route, S extends Stop> extends FilledState<R, S> {
    public constructor(
        fullHistory: Buffer<WithDistance<R | S>[]>,
        history: Buffer<FilledState<R, S>>,
        distanceCalculator: DistanceCalculator<R, S>,
        location: GeoPosition,
        public readonly guesses: WithDistance<S>[]
    ) {
        super(fullHistory, history, distanceCalculator, location, guesses);
        if (guesses.length === 0) throw new Error("StopState needs at least one guess");
    }
}
