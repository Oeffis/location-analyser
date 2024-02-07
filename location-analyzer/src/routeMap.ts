import { GeoLocation, Route, Section, Stop } from "./index.js";

export type TransitPOI = Route | Stop;

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

export class RouteMap<R extends Route, S extends Stop> {
    protected coordinateMap = new Map<number, POIReference<R, S>[]>();

    constructor() {
        this.coordinateMap = new Map();
    }

    public update(pois: (R | S)[]): void {
        this.coordinateMap = new Map();
        pois.forEach(route => this.add(route));
    }

    public add(poi: R | S): void {
        if (isRoute(poi)) {
            this.addRoute(poi);
        } else {
            this.addStop(poi);
        }
    }

    protected addRoute(route: R): void {
        route.sections.forEach(consecutiveSection => this.addConsecutiveSection(consecutiveSection, route));
    }

    protected addConsecutiveSection(consecutiveSection: Section[], route: R): void {
        if (consecutiveSection.length === 1) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.addSection(consecutiveSection[0]!, consecutiveSection[0]!, route);
            return;
        }
        consecutiveSection.forEach((section, index, others) => {
            const next = others[index + 1];
            if (next === undefined) return;
            this.addSection(section, next, route);
        });
    }

    protected addSection(section: Section, next: Section, route: R): void {
        const keys = GeoMapKey
            .fromSection(section, next)
            .map(key => key.numeric());

        for (const key of keys) {
            const routes = this.coordinateMap.get(key) ?? [];
            routes.push({
                poi: route,
                consecutiveSection: section.consecutiveSection,
                section: section.sequence,
                start: {
                    latitude: section.lat,
                    longitude: section.lon
                },
                end: {
                    latitude: next.lat,
                    longitude: next.lon
                }
            } as RouteReference<R>);
            this.coordinateMap.set(key, routes);
        }
    }

    protected addStop(stop: S): void {
        stop.boundaries.forEach((section, index, others) => {
            const next = others[index + 1];
            if (next === undefined) return;
            this.addStopBoundary(section, next, stop);
        });
    }

    protected addStopBoundary(location: GeoLocation, next: GeoLocation, stop: S): void {
        const keys = GeoMapKey.fromStopBoundary(location, next);
        for (const key of keys) {
            const routes = this.coordinateMap.get(key.numeric()) ?? [];
            routes.push({
                poi: stop,
                start: location,
                end: next
            } as StopReference<S>);
            this.coordinateMap.set(key.numeric(), routes);
        }
    }

    public getPOIsAtLocation(location: GeoLocation): POIReference<R, S>[] {
        const references = [];
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
            references.push(...routes);
        }
        return references;
    }
}

class GeoMapKey {
    protected static readonly DIGITS_BEFORE_DECIMAL = 3;
    protected static readonly DIGITS_AFTER_DECIMAL = 3;
    protected static readonly TOTAL_DIGITS =
        GeoMapKey.DIGITS_BEFORE_DECIMAL
        + GeoMapKey.DIGITS_AFTER_DECIMAL;
    protected static readonly ROUNDING_FACTOR = Math.pow(10, GeoMapKey.DIGITS_AFTER_DECIMAL);
    protected static readonly TILING_FACTOR = Math.pow(10, GeoMapKey.TOTAL_DIGITS);

    protected constructor(
        protected readonly latInt: number,
        protected readonly lonInt: number
    ) { }

    protected static toRoundedInt(value: number): number {
        return Math.round(value * GeoMapKey.ROUNDING_FACTOR);
    }

    public numeric(): number {
        return this.latInt * GeoMapKey.TILING_FACTOR + this.lonInt;
    }

    public withLatOffset(latOffset: number): GeoMapKey {
        return new GeoMapKey(this.latInt + latOffset, this.lonInt);
    }

    public withLonOffset(lonOffset: number): GeoMapKey {
        return new GeoMapKey(this.latInt, this.lonInt + lonOffset);
    }

    public static fromRaw(latitude: number, longitude: number): GeoMapKey {
        return new GeoMapKey(
            GeoMapKey.toRoundedInt(latitude),
            GeoMapKey.toRoundedInt(longitude)
        );
    }

    public static fromGeoLocation(location: GeoLocation): GeoMapKey {
        return GeoMapKey.fromRaw(location.latitude, location.longitude);
    }

    public static fromSection(section: Section, sectionEnd: Section): GeoMapKey[] {
        const start = GeoMapKey.fromRaw(section.lat, section.lon);
        const end = GeoMapKey.fromRaw(sectionEnd.lat, sectionEnd.lon);

        return GeoMapKey.fromRange(start.latInt, end.latInt, start.lonInt, end.lonInt);
    }

    public static fromStopBoundary(boundary: GeoLocation, next: GeoLocation): GeoMapKey[] {
        const start = GeoMapKey.fromRaw(boundary.latitude, boundary.longitude);
        const end = GeoMapKey.fromRaw(next.latitude, next.longitude);

        return GeoMapKey.fromRange(start.latInt, end.latInt, start.lonInt, end.lonInt);
    }

    protected static fromRange(startLat: number, endLat: number, startLon: number, endLon: number): GeoMapKey[] {
        const keys = [];
        [startLat, endLat] = [Math.min(startLat, endLat), Math.max(startLat, endLat)];
        [startLon, endLon] = [Math.min(startLon, endLon), Math.max(startLon, endLon)];

        for (let lat = startLat; lat <= endLat; lat++) {
            for (let lon = startLon; lon <= endLon; lon++) {
                keys.push(new GeoMapKey(lat, lon));
            }
        }
        return keys;
    }
}

export function isRouteRef<R extends Route, S extends Stop>(ref: POIReference<R, S>): ref is RouteReference<R> {
    return isRoute(ref.poi);
}

export function isRoute(poi: TransitPOI): poi is Route {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return (poi as Route).sections !== undefined;
}

export function isStop(poi: TransitPOI): poi is Stop {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return (poi as Stop).boundaries !== undefined;
}
