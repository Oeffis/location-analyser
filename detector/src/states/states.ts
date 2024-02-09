
import { Route, Stop, WithDistance, isRoute } from "../index.js";
export * from "./state.js";

export * from "./filledState.js";
export * from "./routeState.js";
export * from "./stopState.js";
export * from "./unknownState.js";

export function isRouteDistance<R extends Route, S extends Stop>(poi: WithDistance<R | S>): poi is WithDistance<R> {
    return isRoute(poi.poi);
}

export function isStopDistance<R extends Route, S extends Stop>(poi: WithDistance<R | S>): poi is WithDistance<S> {
    return !isRoute(poi.poi);
}
