import { GeoLocation, Route, Section, Stop } from "./locationAnalyzer";

export type TransitPOI = Route | Stop;
export interface POIReference {
    poi: TransitPOI;
    start: GeoMapKey;
    end: GeoMapKey;
}

export class RouteMap {
    protected coordinateMap = new Map<number, POIReference[]>();

    constructor() {
        this.coordinateMap = new Map();
    }

    public update(pois: TransitPOI[]): void {
        this.coordinateMap = new Map();
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
        route.sections.forEach(consecutiveSection => this.addConsecutiveSection(consecutiveSection, route));
    }

    protected addConsecutiveSection(consecutiveSection: Section[], route: Route): void {
        if (consecutiveSection.length === 1) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.addSection(consecutiveSection[0]!, consecutiveSection[0]!, route);
            return;
        }
        consecutiveSection.forEach((section, index, others) => {
            const next = others[index + 1];
            if (next === undefined) {
                return;
            }
            this.addSection(section, next, route);
        });
    }

    protected addSection(section: Section, next: Section, route: Route): void {
        const key = GeoMapKey.fromSection(section).numeric();
        const routes = this.coordinateMap.get(key) ?? [];
        routes.push({
            poi: route,
            start: GeoMapKey.fromSection(section),
            end: GeoMapKey.fromSection(next)
        });
        this.coordinateMap.set(key, routes);
    }

    protected addStop(stop: Stop): void {
        if (stop.boundaries.length === 1) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.addStopBoundary(stop.boundaries[0]!, stop.boundaries[0]!, stop);
            return;
        }
        stop.boundaries.forEach((section, index, others) => {
            const next = others[index + 1];
            if (next === undefined) {
                return;
            }
            this.addStopBoundary(section, next, stop);
        });
    }

    protected addStopBoundary(location: GeoLocation, next: GeoLocation, stop: Stop): void {
        const key = GeoMapKey.fromGeoLocation(location).numeric();
        const routes = this.coordinateMap.get(key) ?? [];
        routes.push({
            poi: stop,
            start: GeoMapKey.fromStopBoundaryPoint(location),
            end: GeoMapKey.fromStopBoundaryPoint(next)
        });
        this.coordinateMap.set(key, routes);
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
            const routes = this.coordinateMap.get(key) ?? [];
            routes.forEach(route => routeSet.add(route.poi));
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

    public static fromStopBoundaryPoint(boundary: GeoLocation): GeoMapKey {
        return new GeoMapKey(boundary.latitude, boundary.longitude);
    }
}

export function isRoute(poi: TransitPOI): poi is Route {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return (poi as Route).sections !== undefined;
}

export function isStop(poi: TransitPOI): poi is Stop {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return (poi as Stop).boundaries !== undefined;
}
