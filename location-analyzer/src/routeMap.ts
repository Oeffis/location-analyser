import { GeoLocation, Route, Section, Stop } from "./locationAnalyzer";

export type TransitPOI = Route | Stop;

export class RouteMap {
    protected coordinateRouteMap = new Map<number, TransitPOI[]>();

    constructor() {
        this.coordinateRouteMap = new Map();
    }

    public update(pois: TransitPOI[]): void {
        this.coordinateRouteMap = new Map();
        pois.forEach(route => this.add(route));
    }

    public add(poi: TransitPOI): void {
        if (isRoute(poi)) {
            this.addRoute(poi);
        } else {
            this.addStop(poi);
        }
    }

    protected addRoute(route: Route): void {
        route.sections.forEach(section => this.addSection(section, route));
    }

    protected addSection(section: Section, route: Route): void {
        const key = GeoMapKey.fromSection(section).numeric();
        const routes = this.coordinateRouteMap.get(key) ?? [];
        routes.push(route);
        this.coordinateRouteMap.set(key, routes);
    }

    protected addStop(stop: Stop): void {
        const key = GeoMapKey.fromStop(stop).numeric();
        const routes = this.coordinateRouteMap.get(key) ?? [];
        routes.push(stop);
        this.coordinateRouteMap.set(key, routes);
    }

    public getPOIsAtLocation(location: GeoLocation): TransitPOI[] {
        const routeSet = new Set<TransitPOI>();
        const offsetMatrix: [number, number][] = [
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

    public static fromStop(stop: Stop): GeoMapKey {
        return new GeoMapKey(stop.location.latitude, stop.location.longitude);
    }
}

export function isRoute(poi: TransitPOI): poi is Route {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return (poi as Route).sections !== undefined;
}
