import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance } from "../distanceCalculator.js";
import { FilledState, GeoPosition } from "./states.js";

export class UnknownState extends FilledState {
    public constructor(
        fullHistory: Buffer<POIWithDistance[]>,
        history: Buffer<FilledState>,
        distanceCalculator: DistanceCalculator,
        location: GeoPosition
    ) {
        super(fullHistory, history, distanceCalculator, location, []);
    }
}
