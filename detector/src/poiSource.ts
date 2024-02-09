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
