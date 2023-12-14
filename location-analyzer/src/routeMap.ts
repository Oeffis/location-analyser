import { GeoLocation, Route, Section } from "locationAnalyzer";

export class RouteMap {
    protected static readonly LAT_LANG_DIGITS_BEFORE_DECIMAL = 3;
    protected static readonly LAT_LANG_DIGITS_AFTER_DECIMAL = 2;
    protected static readonly ROUNDING_FACTOR = Math.pow(10, RouteMap.LAT_LANG_DIGITS_AFTER_DECIMAL);
    protected static readonly TILING_FACTOR = Math.pow(10, RouteMap.LAT_LANG_DIGITS_BEFORE_DECIMAL + RouteMap.LAT_LANG_DIGITS_AFTER_DECIMAL);

    protected coordinateRouteMap = new Map<number, Route[]>();

    constructor() {
        this.coordinateRouteMap = new Map();
    }

    public updateRoutes(routes: Route[]): void {
        this.coordinateRouteMap = new Map();
        routes.forEach(route => this.addRoute(route));
    }

    public addRoute(route: Route): void {
        for (const section of route.sections) {
            const key = this.getMapKeyForSection(section);
            const routes = this.coordinateRouteMap.get(key) ?? [];
            routes.push(route);
            this.coordinateRouteMap.set(key, routes);
        }
    }

    protected getMapKeyForSection(section: Section): number {
        return this.getMapKeyForLocation(sectionToGeoLocation(section));
    }

    protected getMapKeyForLocation(location: GeoLocation): number {
        return this.getOffsetKeyForLocation(location, 0, 0);
    }

    protected getOffsetKeyForLocation(location: GeoLocation, latOffset: number, lonOffset: number): number {
        const roundedLat = Math.round(location.latitude * RouteMap.ROUNDING_FACTOR);
        const roundedLon = Math.round(location.longitude * RouteMap.ROUNDING_FACTOR);
        return (roundedLat + latOffset) * RouteMap.TILING_FACTOR + (roundedLon + lonOffset);
    }

    public getRoutesAtLocation(location: GeoLocation): Route[] {
        const key = this.getMapKeyForLocation(location);
        const routes = this.coordinateRouteMap.get(key);
        const routeSet = new Set<Route>(routes);

        const offsetMatrix = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 0], [-1, 1], [1, -1], [1, 0], [1, 1]];

        for (const [latOffset, lonOffset] of offsetMatrix) {
            const key = this.getOffsetKeyForLocation(location, latOffset, lonOffset);
            const routes = this.coordinateRouteMap.get(key) ?? [];
            routes.forEach(route => routeSet.add(route));
        }

        return Array.from(routeSet);
    }
}

function sectionToGeoLocation(section: Section): GeoLocation {
    return {
        latitude: section.lat,
        longitude: section.lon
    };
} 
