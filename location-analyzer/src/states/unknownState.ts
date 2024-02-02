import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance, StopWithDistance } from "../distanceCalculator.js";
import { FilledState, GeoPosition, ResultStatus, RouteState, StopState, isRouteDistance, isStopDistance } from "./states.js";

export class UnknownState extends FilledState {
    public constructor(
        fullHistory: Buffer<POIWithDistance[]>,
        history: Buffer<ResultStatus>,
        distanceCalculator: DistanceCalculator,
        location: GeoPosition,
        nearbyPlatforms: StopWithDistance[],
    ) {
        super(fullHistory, history, distanceCalculator, location, [], nearbyPlatforms);
    }

    public getNext(location: GeoPosition): FilledState {
        const closestPois = this.distanceCalculator.getUniquePOIsNear(location);
        this.fullHistory.append(closestPois);

        const closesByAveraged = this.getClosestByAveragedDistance(closestPois);
        const firstPoi = closesByAveraged[0];
        if (!firstPoi) {
            return new UnknownState(
                this.fullHistory,
                this.history,
                this.distanceCalculator,
                location,
                this.nearbyPlatforms
            );
        }

        const anyIsStop = isStopDistance(firstPoi.guess);
        if (anyIsStop) {
            return new StopState(
                this.fullHistory,
                this.history,
                this.distanceCalculator,
                location,
                closesByAveraged.map(guess => guess.guess).filter(isStopDistance),
                this.nearbyPlatforms
            );
        }

        if (location.speed > this.onRouteSpeedCutoff) {
            return new RouteState(
                this.fullHistory,
                this.history,
                this.distanceCalculator,
                location,
                closesByAveraged.map(guess => guess.guess).filter(isRouteDistance),
                closesByAveraged.map(guess => guess.guess).filter(isRouteDistance),
                this.nearbyPlatforms
            );
        }

        return new UnknownState(
            this.fullHistory,
            this.history,
            this.distanceCalculator,
            location,
            this.nearbyPlatforms
        );
    }
}
