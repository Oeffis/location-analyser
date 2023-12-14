import { getDistance } from "geolib";
import { getDistanceFromLine } from "./getDistanceFromLine";
import { RouteMap } from "./routeMap";

export class LocationAnalyzer {
    private currentLocation?: GeoLocation;
    private status?: Status;
    private stops: Stop[] = [];

    private routeMap = new RouteMap();

    public constructor(
        stops: Stop[] = [],
        routes: Route[] = []
    ) {
        this.updateStops(stops);
        this.updateRoutes(routes);
    }

    public updateLocation(location?: GeoLocation): void {
        this.currentLocation = location;
        this.invalidateStatus();
    }

    private invalidateStatus(): void {
        this.status = undefined;
    }

    public getStatus(): Status {
        this.status = this.status ?? this.calculateStatus();
        return this.status;
    }

    private calculateStatus(): Status {
        const currentLocation = this.currentLocation;
        if (!currentLocation) {
            return {
                stops: [],
                routes: []
            };
        }

        const sortedStops = this.stops
            .map(stop => ({
                ...stop,
                distance: getDistance(currentLocation, stop.location)
            }))
            .sort((a, b) => a.distance - b.distance);

        const nearbyRoutes = this.routeMap.getRoutesAtLocation(currentLocation);
        const sortedRoutes = nearbyRoutes
            .map(route => ({
                ...route,
                distance: route.sections.reduce((minDistance, section, index, sections) => {
                    if (index === sections.length - 1) {
                        return minDistance;
                    }
                    return Math.min(minDistance, getDistanceFromLine(currentLocation, {
                        latitude: section.lat,
                        longitude: section.lon
                    }, {
                        latitude: sections[index + 1]?.lat,
                        longitude: sections[index + 1]?.lon
                    },
                        0.1
                    ));
                }, Number.MAX_SAFE_INTEGER)
            })).sort((a, b) => a.distance - b.distance);
        return {
            stops: sortedStops,
            routes: sortedRoutes
        };
    }

    public updateStops(stops: Stop[]): void {
        this.stops = stops;
        this.invalidateStatus();
    }

    public updateRoutes(routes: Route[]): void {
        this.routeMap.updateRoutes(routes);
        this.invalidateStatus();
    }
}

export interface Status {
    stops: StatusStop[];
    routes: StatusRoute[];
}

export type StatusStop = Stop & { distance: number };
export type StatusRoute = Route & { distance: number };

export interface Stop {
    id: string;
    location: GeoLocation;
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
    sections: Section[];
}

export interface Section {
    routeId: string;
    sequence: number;
    lat: number;
    lon: number;
}
