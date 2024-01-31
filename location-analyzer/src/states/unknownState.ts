import { Buffer } from "../buffer.js";
import { DistanceCalculator, StopWithDistance } from "../distanceCalculator.js";
import { FilledState, GeoPosition, ResultStatus } from "./states.js";

export class UnknownState extends FilledState {
    public constructor(
        history: Buffer<ResultStatus>,
        distanceCalculator: DistanceCalculator,
        location: GeoPosition,
        nearbyPlatforms: StopWithDistance[],
    ) {
        super(history, distanceCalculator, location, [], nearbyPlatforms);
    }
}
