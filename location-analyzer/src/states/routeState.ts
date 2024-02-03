import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance, RouteWithDistance } from "../distanceCalculator.js";
import { FilledState, GeoPosition, ResultStatus, StopState, UnknownState, isRouteDistance, isStopDistance } from "./states.js";

export class RouteState extends FilledState implements ResultStatus {
    public readonly possibilityIds = new Set<string>();
    public constructor(
        fullHistory: Buffer<POIWithDistance[]>,
        history: Buffer<ResultStatus>,
        distanceCalculator: DistanceCalculator,
        location: GeoPosition,
        public readonly guesses: RouteWithDistance[],
        protected readonly possibilities: RouteWithDistance[]
    ) {
        super(fullHistory, history, distanceCalculator, location, guesses);
        if (guesses.length === 0) throw new Error("RouteState needs at least one guess");
        if (possibilities.length === 0) throw new Error("RouteState needs at least one possibility");
        possibilities.forEach(possibility => this.possibilityIds.add(possibility.poi.id));
    }

    public getNext(location: GeoPosition): FilledState {
        const closestPois = this.distanceCalculator
            .getUniquePOIsNear(location)
            .filter(this.directionFilter(location));
        this.fullHistory.append(closestPois);

        const rightDirectionRoutes = closestPois
            .filter(isRouteDistance)
            .filter(poi => this.possibilityIds.has(poi.poi.id));
        let closest = this.getClosestByAveragedDistance(rightDirectionRoutes);

        if (location.speed < this.onRouteSpeedCutoff) {
            closest = closest.filter(route => route.averagedDistance < (location.accuracy * 2));
        }

        if (closest.length !== 0) {
            return new RouteState(
                this.fullHistory,
                this.history,
                this.distanceCalculator,
                location,
                closest.map(route => route.guess),
                this.possibilities
            );
        }

        const closestByCumulation = this.getClosestByAveragedDistance(closestPois).map(guess => guess.guess);
        const stopsInClosest = closestByCumulation.filter(isStopDistance);
        if (stopsInClosest.length > 0) {
            return new StopState(
                this.fullHistory,
                this.history,
                this.distanceCalculator,
                location,
                stopsInClosest
            );
        }

        return new UnknownState(
            this.fullHistory,
            this.history,
            this.distanceCalculator,
            location
        );
    }
}
