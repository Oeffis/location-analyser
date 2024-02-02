import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance, StopWithDistance } from "../distanceCalculator.js";
import { FilledState, GeoPosition, ResultStatus, RouteState, State, StopState, UnknownState, isRouteDistance, isStopDistance } from "./states.js";

export class InitialState extends State {
    public constructor(
        fullHistory = new Buffer<POIWithDistance[]>(10),
        history = new Buffer<ResultStatus>(10),
        distanceCalculator = new DistanceCalculator(),
        guesses = new Array<POIWithDistance>()
    ) {
        super(fullHistory, history, distanceCalculator, guesses);
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

    public get nearbyPlatforms(): StopWithDistance[] {
        return [];
    }
}
