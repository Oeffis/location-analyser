import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance } from "../distanceCalculator.js";
import { FilledState, GeoPosition, ResultStatus } from "./states.js";

export class UnknownState extends FilledState {
    public constructor(
        fullHistory: Buffer<POIWithDistance[]>,
        history: Buffer<ResultStatus>,
        distanceCalculator: DistanceCalculator,
        location: GeoPosition
    ) {
        super(fullHistory, history, distanceCalculator, location, []);
    }
}
