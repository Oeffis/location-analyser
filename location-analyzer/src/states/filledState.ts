import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance, WithDistance } from "../distanceCalculator.js";
import { TransitPOI } from "../routeMap.js";
import { GeoPosition, State, Stop } from "./states.js";

export abstract class FilledState extends State {
    public constructor(
        fullHistory: Buffer<POIWithDistance[]>,
        history: Buffer<FilledState>,
        distanceCalculator: DistanceCalculator,
        public readonly location: GeoPosition,
        public readonly guesses: WithDistance<TransitPOI>[]
    ) {
        super(fullHistory, history, distanceCalculator, guesses);
        this.history.append(this);
    }

    public get nearbyPlatforms(): WithDistance<Stop>[] {
        const uniquePois = this.distanceCalculator.getUniquePOIsNear(this.location);
        return this.getNearbyPlatformsIn(uniquePois);
    }
}
