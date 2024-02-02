import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance, StopWithDistance } from "../distanceCalculator.js";
import { GeoPosition, InitialState, ResultStatus } from "./states.js";

export abstract class FilledState extends InitialState implements ResultStatus {
    public constructor(
        fullHistory: Buffer<POIWithDistance[]>,
        history: Buffer<ResultStatus>,
        distanceCalculator: DistanceCalculator,
        public readonly location: GeoPosition,
        public readonly guesses: POIWithDistance[]
    ) {
        super(fullHistory, history, distanceCalculator, guesses);
        this.history.append(this);
    }

    public get nearbyPlatforms(): StopWithDistance[] {
        const uniquePois = this.distanceCalculator.getUniquePOIsNear(this.location);
        return this.getNearbyPlatformsIn(uniquePois);
    }
}
