import { GeoLocation, Route } from "locationAnalyzer";

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

        for (const route of routes) {
            for (const section of route.sections) {
                const roundedLat = Math.round(section.lat * RouteMap.ROUNDING_FACTOR);
                const roundedLon = Math.round(section.lon * RouteMap.ROUNDING_FACTOR);
                const key = roundedLat * RouteMap.TILING_FACTOR + roundedLon;
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
        }
    }

    public getRoutesAtLocation(location: GeoLocation): Route[] {
        const roundedLat = Math.round(location.latitude * RouteMap.ROUNDING_FACTOR);
        const roundedLon = Math.round(location.longitude * RouteMap.ROUNDING_FACTOR);
        const key = roundedLat * RouteMap.TILING_FACTOR + roundedLon;
        const routes = this.coordinateRouteMap.get(key);

        const nextLatKey = (roundedLat + 1) * RouteMap.TILING_FACTOR + roundedLon;
        const nextRoutes = this.coordinateRouteMap.get(nextLatKey);

        const previousLatKey = (roundedLat - 1) * RouteMap.TILING_FACTOR + roundedLon;
        const previousRoutes = this.coordinateRouteMap.get(previousLatKey);

        const nextLonKey = roundedLat * RouteMap.TILING_FACTOR + (roundedLon + 1);
        const nextLonRoutes = this.coordinateRouteMap.get(nextLonKey);

        const previousLonKey = roundedLat * RouteMap.TILING_FACTOR + (roundedLon - 1);
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
