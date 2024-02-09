import { Buffer } from "../buffer.js";
import { DistanceCalculator, FilledState, GeoPosition, Route, Stop, WithDistance, isRouteDistance } from "../index.js";

export class RouteState<R extends Route, S extends Stop> extends FilledState<R, S> {
    public readonly possibilityIds = new Set<string>();
    public constructor(
        fullHistory: Buffer<WithDistance<R | S>[]>,
        history: Buffer<FilledState<R, S>>,
        distanceCalculator: DistanceCalculator<R, S>,
        location: GeoPosition,
        public readonly guesses: WithDistance<R>[],
        protected readonly possibilities: WithDistance<R>[]
    ) {
        super(fullHistory, history, distanceCalculator, location, guesses);
        if (guesses.length === 0) throw new Error("RouteState needs at least one guess");
        if (possibilities.length === 0) throw new Error("RouteState needs at least one possibility");
        possibilities.forEach(possibility => this.possibilityIds.add(possibility.poi.id));
    }

    protected override makeRouteState(location: GeoPosition, possibleRoutes: WithDistance<R>[]): FilledState<R, S> {
        return new RouteState(
            this.fullHistory,
            this.history,
            this.distanceCalculator,
            location,
            possibleRoutes,
            this.possibilities
        );
    }

    protected override getPossibleRoutes(closestPois: (WithDistance<R> | WithDistance<S>)[], location: GeoPosition): WithDistance<R>[] {
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
