import { WithDistance } from "../distanceCalculator.js";
import { isRoute } from "../routeMap.js";
export * from "./state.js";

export * from "./filledState.js";
export * from "./routeState.js";
export * from "./stopState.js";
export * from "./unknownState.js";

export function byProximity<R extends Route, S extends Stop>(a: WithDistance<R | S>, b: WithDistance<R | S>): number {
    return a.distance.value - b.distance.value;
}

export function isCloserThan<R extends Route, S extends Stop>(maxDistance: number): (poi: WithDistance<R | S>) => boolean {
    return poi => poi.distance.value <= maxDistance;
}

export function isGuessFor<R extends Route, S extends Stop>(poi: R | S): (guess: WithDistance<R | S>) => boolean {
    return guess => guess.poi.id === poi.id;
}

export function isRouteDistance<R extends Route, S extends Stop>(poi: WithDistance<R | S>): poi is WithDistance<R> {
    return isRoute(poi.poi);
}

export function isStopDistance<R extends Route, S extends Stop>(poi: WithDistance<R | S>): poi is WithDistance<S> {
    return !isRoute(poi.poi);
}

export interface Stop {
    id: string;
    boundaries: GeoLocation[];
}

export interface GeoPosition extends GeoLocation {
    accuracy: number;
    speed: number;
}

export interface GeoLocation {
    latitude: number;
    longitude: number;
    altitude?: number;
}

export interface Route {
    id: string;
    sections: Section[][];
}

export interface Section {
    routeId: string;
    consecutiveSection: number;
    sequence: number;
    lat: number;
    lon: number;
}
