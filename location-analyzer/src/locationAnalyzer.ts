import { getDistance } from "geolib";
import { getDistanceFromLine } from "getDistanceFromLine";

const LAT_LANG_DIGITS_BEFORE_DECIMAL = 3;
const LAT_LANG_DIGITS_AFTER_DECIMAL = 2;
const ROUNDING_FACTOR = Math.pow(10, LAT_LANG_DIGITS_AFTER_DECIMAL);
const TILING_FACTOR = Math.pow(10, LAT_LANG_DIGITS_BEFORE_DECIMAL + LAT_LANG_DIGITS_AFTER_DECIMAL);

export class LocationAnalyzer {
    private currentLocation?: GeoLocation;
    private status?: Status;
    private stops: Stop[] = [];

    private coordinateRouteMap = new Map<number, Route[]>();

    public constructor(
        stops: Stop[] = [],
        private routes: Route[] = []
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

        const nearbyRoutes = this.getRoutesAtLocation(currentLocation);
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
        const slicedRoutes = sortedRoutes.slice(0, 2);
        return {
            stops: sortedStops,
            routes: slicedRoutes
        };
    }

    public updateStops(stops: Stop[]): void {
        this.stops = stops;
        this.invalidateStatus();
    }

    public updateRoutes(routes: Route[]): void {
        this.coordinateRouteMap = new Map();

        for (const route of routes) {
            for (const section of route.sections) {
                const roundedLat = Math.round(section.lat * ROUNDING_FACTOR);
                const roundedLon = Math.round(section.lon * ROUNDING_FACTOR);
                const key = roundedLat * TILING_FACTOR + roundedLon;
                const routesAtCoordinate = this.coordinateRouteMap.get(key);
                if (!routesAtCoordinate) {
                    this.coordinateRouteMap.set(key, [route]);
                } else {
                    if (routesAtCoordinate.includes(route)) {
                        continue;
                    }
                    routesAtCoordinate.push(route);
                }
            }

            this.invalidateStatus();
        }
    }

    public getRoutesAtLocation(location: GeoLocation): Route[] {
        const roundedLat = Math.round(location.latitude * ROUNDING_FACTOR);
        const roundedLon = Math.round(location.longitude * ROUNDING_FACTOR);
        const key = roundedLat * TILING_FACTOR + roundedLon;
        const routes = this.coordinateRouteMap.get(key);

        const nextLatKey = (roundedLat + 1) * TILING_FACTOR + roundedLon;
        const nextRoutes = this.coordinateRouteMap.get(nextLatKey);

        const previousLatKey = (roundedLat - 1) * TILING_FACTOR + roundedLon;
        const previousRoutes = this.coordinateRouteMap.get(previousLatKey);

        const nextLonKey = roundedLat * TILING_FACTOR + (roundedLon + 1);
        const nextLonRoutes = this.coordinateRouteMap.get(nextLonKey);

        const previousLonKey = roundedLat * TILING_FACTOR + (roundedLon - 1);
        const previousLonRoutes = this.coordinateRouteMap.get(previousLonKey);

        const routeSet = new Set<Route>();
        if (routes) {
            routes.forEach(route => routeSet.add(route));
        }
        if (nextRoutes) {
            nextRoutes.forEach(route => routeSet.add(route));
        }
        if (previousRoutes) {
            previousRoutes.forEach(route => routeSet.add(route));
        }
        if (nextLonRoutes) {
            nextLonRoutes.forEach(route => routeSet.add(route));
        }
        if (previousLonRoutes) {
            previousLonRoutes.forEach(route => routeSet.add(route));
        }

        return Array.from(routeSet);
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
