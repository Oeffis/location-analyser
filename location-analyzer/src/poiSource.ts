import { GeoLocation, GeoPosition, Route, Stop } from "./index.js";

export interface POISource<R extends Route, S extends Stop> {
    getPOIsAtLocation(location: GeoPosition): POIReference<R, S>[];
}

export type POIReference<R, S> = RouteReference<R> | StopReference<S>;

export interface StopReference<S> {
    poi: S;
    start: GeoLocation;
    end?: GeoLocation;
}

export interface RouteReference<R> {
    poi: R;
    consecutiveSection: number;
    section: number;
    start: GeoLocation;
    end: GeoLocation;
}
