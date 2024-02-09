import { Buffer } from "../buffer.js";
import { DistanceCalculator, GeoPosition, Route, State, Stop, WithDistance } from "../index.js";

export abstract class FilledState<R extends Route, S extends Stop> extends State<R, S> {
    public constructor(
        fullHistory: Buffer<WithDistance<R | S>[]>,
        history: Buffer<FilledState<R, S>>,
        distanceCalculator: DistanceCalculator<R, S>,
        public readonly location: GeoPosition,
        public readonly guesses: (WithDistance<R | S>)[]
    ) {
        super(fullHistory, history, distanceCalculator, guesses);
        this.history.append(this);
    }

    public get nearbyPlatforms(): WithDistance<S>[] {
        const uniquePois = this.distanceCalculator.getUniquePOIsNear(this.location);
        return this.getNearbyPlatformsIn(uniquePois);
    }
}
