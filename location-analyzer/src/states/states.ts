import { POIWithDistance, WithDistance } from "../distanceCalculator.js";
import { TransitPOI, isRoute } from "../routeMap.js";
export * from "./state.js";

export * from "./filledState.js";
export * from "./routeState.js";
export * from "./stopState.js";
export * from "./unknownState.js";

export function byProximity(a: POIWithDistance, b: POIWithDistance): number {
    return a.distance.value - b.distance.value;
}

export function isCloserThan(maxDistance: number): (poi: POIWithDistance) => boolean {
    return poi => poi.distance.value <= maxDistance;
}

export function isGuessFor(poi: TransitPOI): (guess: POIWithDistance) => boolean {
    return guess => guess.poi.id === poi.id;
}

export function isRouteDistance(poi: POIWithDistance): poi is WithDistance<Route> {
    return isRoute(poi.poi);
}

export function isStopDistance(poi: POIWithDistance): poi is WithDistance<Stop> {
    return !isRoute(poi.poi);
}

export interface Stop {
    id: string;
    name: string;
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
    from: string;
    to: string;
    ref: string;
    sections: Section[][];
}

export interface Section {
    routeId: string;
    consecutiveSection: number;
    sequence: number;
    lat: number;
    lon: number;
}
