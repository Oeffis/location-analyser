import { GeoLocation, Route, Section } from "locationAnalyzer";

export class RouteMap {
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
            const key = GeoMapKey.fromSection(section).numeric();
            const routes = this.coordinateRouteMap.get(key) ?? [];
            routes.push(route);
            this.coordinateRouteMap.set(key, routes);
        }
    }

    public getRoutesAtLocation(location: GeoLocation): Route[] {
        const routeSet = new Set<Route>();
        const offsetMatrix = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 0], [-1, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        for (const [latOffset, lonOffset] of offsetMatrix) {
            const key = GeoMapKey
                .fromGeoLocation(location)
                .withLatOffset(latOffset)
                .withLonOffset(lonOffset)
                .numeric();
            const routes = this.coordinateRouteMap.get(key) ?? [];
            routes.forEach(route => routeSet.add(route));
        }

        return Array.from(routeSet);
    }
}

class GeoMapKey {
    protected static readonly DIGITS_BEFORE_DECIMAL = 3;
    protected static readonly DIGITS_AFTER_DECIMAL = 2;
    protected static readonly TOTAL_DIGITS =
        GeoMapKey.DIGITS_BEFORE_DECIMAL
        + GeoMapKey.DIGITS_AFTER_DECIMAL;
    protected static readonly ROUNDING_FACTOR = Math.pow(10, GeoMapKey.DIGITS_AFTER_DECIMAL);
    protected static readonly TILING_FACTOR = Math.pow(10, GeoMapKey.TOTAL_DIGITS);

    public constructor(
        public readonly latitude: number,
        public readonly longitude: number
    ) {
        this.latitude = GeoMapKey.round(latitude);
        this.longitude = GeoMapKey.round(longitude);
    }

    protected static round(value: number): number {
        return Math.round(value * GeoMapKey.ROUNDING_FACTOR) / GeoMapKey.ROUNDING_FACTOR;
    }

    public numeric(): number {
        return this.latitude * GeoMapKey.TILING_FACTOR + this.longitude;
    }

    public withLatOffset(latOffset: number): GeoMapKey {
        return new GeoMapKey(this.latitude + latOffset, this.longitude);
    }

    public withLonOffset(lonOffset: number): GeoMapKey {
        return new GeoMapKey(this.latitude, this.longitude + lonOffset);
    }

    public static fromGeoLocation(location: GeoLocation): GeoMapKey {
        return new GeoMapKey(location.latitude, location.longitude);
    }

    public static fromSection(section: Section): GeoMapKey {
        return new GeoMapKey(section.lat, section.lon);
    }
}
