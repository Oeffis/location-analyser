import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance, StopWithDistance } from "../distanceCalculator.js";
import { GeoPosition, ResultStatus, RouteState, State, StopState, byProximity, isCloserThan, isRouteDistance, isStopDistance } from "./states.js";

export class FilledState extends State implements ResultStatus {
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

    public getNext(location: GeoPosition): FilledState {
        const pois = this.distanceCalculator.getUniquePOIsNear(location);
        this.fullHistory.append(pois);
        const rightDirectionPois = pois.filter(this.directionFilter(location));

        const reSeenPoints = this.getClosestByAveragedDistance(rightDirectionPois).map(guess => guess.guess);

        const guesses = rightDirectionPois
            .filter(isCloserThan(location.accuracy))
            .sort(byProximity);

        if (reSeenPoints.length > 0) {
            if (reSeenPoints.every(isRouteDistance)) {
                return new RouteState(this.fullHistory, this.history, this.distanceCalculator, location, reSeenPoints, reSeenPoints);
            } else if (reSeenPoints.every(isStopDistance)) {
                return new StopState(this.fullHistory, this.history, this.distanceCalculator, location, reSeenPoints);
            } else {
                throw new Error("Mixed re-seen points");
            }
        }

        return new FilledState(this.fullHistory, this.history, this.distanceCalculator, location, guesses);
    }

    public get nearbyPlatforms(): StopWithDistance[] {
        const uniquePois = this.distanceCalculator.getUniquePOIsNear(this.location);
        return this.getNearbyPlatformsIn(uniquePois);
    }
}
