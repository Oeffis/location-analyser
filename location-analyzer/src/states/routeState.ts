import { Buffer } from "../buffer.js";
import { DistanceCalculator, POIWithDistance, WithDistance } from "../distanceCalculator.js";
import { FilledState, GeoPosition, Route, isRouteDistance } from "./states.js";

export class RouteState extends FilledState {
    public readonly possibilityIds = new Set<string>();
    public constructor(
        fullHistory: Buffer<POIWithDistance[]>,
        history: Buffer<FilledState>,
        distanceCalculator: DistanceCalculator,
        location: GeoPosition,
        public readonly guesses: WithDistance<Route>[],
        protected readonly possibilities: WithDistance<Route>[]
    ) {
        super(fullHistory, history, distanceCalculator, location, guesses);
        if (guesses.length === 0) throw new Error("RouteState needs at least one guess");
        if (possibilities.length === 0) throw new Error("RouteState needs at least one possibility");
        possibilities.forEach(possibility => this.possibilityIds.add(possibility.poi.id));
    }

    protected override makeRouteState(location: GeoPosition, possibleRoutes: WithDistance<Route>[]): FilledState {
        return new RouteState(
            this.fullHistory,
            this.history,
            this.distanceCalculator,
            location,
            possibleRoutes,
            this.possibilities
        );
    }

    protected override getPossibleRoutes(closestPois: POIWithDistance[], location: GeoPosition): WithDistance<Route>[] {
        const rightDirectionRoutes = closestPois
            .filter(isRouteDistance)
            .filter(poi => this.possibilityIds.has(poi.poi.id));
        let closest = this.getClosestByAveragedDistance(rightDirectionRoutes);

        if (location.speed < this.onRouteSpeedCutoff) {
            closest = closest.filter(route => route.averagedDistance < (location.accuracy * 2));
        }
        return closest.map(route => route.guess);
    }
}
