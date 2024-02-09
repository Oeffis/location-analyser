import { Buffer } from "../buffer.js";
import { DistanceCalculator, WithDistance } from "../distanceCalculator.js";
import { FilledState, GeoPosition, Route, Stop } from "./states.js";

export class UnknownState<R extends Route, S extends Stop> extends FilledState<R, S> {
    public constructor(
        fullHistory: Buffer<WithDistance<R | S>[]>,
        history: Buffer<FilledState<R, S>>,
        distanceCalculator: DistanceCalculator<R, S>,
        location: GeoPosition
    ) {
        super(fullHistory, history, distanceCalculator, location, []);
    }
}
