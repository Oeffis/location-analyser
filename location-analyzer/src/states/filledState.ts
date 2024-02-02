import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance, StopWithDistance } from "../distanceCalculator.js";
import { GeoPosition, ResultStatus, RouteState, State, StopState, byProximity, isCloserThan, isRouteDistance, isStopDistance } from "./states.js";

export class FilledState extends State implements ResultStatus {
    public constructor(
        fullHistory: Buffer<POIWithDistance[]>,
        history: Buffer<ResultStatus>,
        distanceCalculator: DistanceCalculator,
        public readonly location: GeoPosition,
        public readonly guesses: POIWithDistance[],
        public readonly nearbyPlatforms: StopWithDistance[]
    ) {
        super(fullHistory, history, distanceCalculator, guesses, nearbyPlatforms);
        this.history.append(this);
    }

    public getNext(location: GeoPosition): FilledState {
        const pois = this.distanceCalculator.getUniquePOIsNear(location);
        const uniquePois = this.keepClosestOfEachPoi(pois);
        this.fullHistory.append(uniquePois);
        const rightDirectionPois = uniquePois.filter(this.directionFilter(location));
        const nearbyPlatforms = this.getNearbyPlatformsIn(rightDirectionPois);

        const reSeenPoints = this.getClosestByCumulatedDistance(rightDirectionPois, location);

        const guesses = rightDirectionPois
            .filter(isCloserThan(location.accuracy))
            .sort(byProximity);

        if (reSeenPoints.length > 0) {
            if (reSeenPoints.every(isRouteDistance)) {
                return new RouteState(this.fullHistory, this.history, this.distanceCalculator, location, reSeenPoints, nearbyPlatforms);
            } else if (reSeenPoints.every(isStopDistance)) {
                return new StopState(this.fullHistory, this.history, this.distanceCalculator, location, reSeenPoints, nearbyPlatforms);
            } else {
                throw new Error("Mixed re-seen points");
            }
        }

        return new FilledState(this.fullHistory, this.history, this.distanceCalculator, location, guesses, nearbyPlatforms);
    }
}
