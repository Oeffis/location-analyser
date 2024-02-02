import { Buffer } from "../buffer.js";
import { DistanceCalculator } from "../distanceCalculator.js";
import { FilledState, GeoPosition, RouteState, State, StopState, UnknownState, isRouteDistance, isStopDistance } from "./states.js";

export class InitialState extends State {
    public constructor() {
        super(new Buffer(10), new Buffer(10), new DistanceCalculator(), []);
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
                location
            );
        }

        const anyIsStop = isStopDistance(firstPoi.guess);
        if (anyIsStop) {
            return new StopState(
                this.fullHistory,
                this.history,
                this.distanceCalculator,
                location,
                closesByAveraged.map(guess => guess.guess).filter(isStopDistance)
            );
        }

        if (location.speed > this.onRouteSpeedCutoff) {
            return new RouteState(
                this.fullHistory,
                this.history,
                this.distanceCalculator,
                location,
                closesByAveraged.map(guess => guess.guess).filter(isRouteDistance),
                closesByAveraged.map(guess => guess.guess).filter(isRouteDistance)
            );
        }

        return new UnknownState(
            this.fullHistory,
            this.history,
            this.distanceCalculator,
            location
        );
    }

    public get nearbyPlatforms(): [] {
        return [];
    }
}
