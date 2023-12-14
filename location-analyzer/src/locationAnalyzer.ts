import { getDistance } from "geolib";
import { getDistanceFromLine } from "./getDistanceFromLine";
import { RouteMap, TransitPOI, isRoute } from "./routeMap";

export class LocationAnalyzer {
    protected currentLocation?: GeoLocation;
    protected status?: Status;

    protected routeMap = new RouteMap();

    public constructor(
        pois: TransitPOI[] = [],
    ) {
        this.updatePOIs(pois);
    }

    public updateLocation(location?: GeoLocation): void {
        this.currentLocation = location;
        this.invalidateStatus();
    }

    protected invalidateStatus(): void {
        this.status = undefined;
    }

    public getStatus(): Status {
        this.status = this.status ?? this.calculateStatus();
        return this.status;
    }

    protected calculateStatus(): Status {
        const currentLocation = this.currentLocation;
        if (!currentLocation) {
            return {
                pois: []
            };
        }

        const nearbyPOIs = this.routeMap.getPOIsAtLocation(currentLocation);
        const sortedPOIs = nearbyPOIs
            .map(poi => this.withDistance(currentLocation, poi))
            .sort((a, b) => a.distance - b.distance);

        return {
            pois: sortedPOIs
        };
    }

    protected withDistance<T extends Stop | Route>(base: GeoLocation, poi: T): T & { distance: number } {
        const distance = this.distance(base, poi);
        return { ...poi, distance };
    }

    protected distance<T extends Stop | Route>(base: GeoLocation, poi: T): number {
        if (isRoute(poi)) {
            return this.routeDistance(poi, base);
        }
        return this.stopDistance(poi, base);
    }

    private routeDistance(poi: Route, base: GeoLocation): number {
        return poi.sections.reduce((min, section, index, sections) => {
            if (index === 0) {
                return min;
            }
            const distance = getDistanceFromLine(base, {
                lat: section.lat,
                lon: section.lon
            }, {
                lat: sections[index - 1].lat,
                lon: sections[index - 1].lon
            }, 0.1);
            return Math.min(min, distance);
        }, Number.MAX_SAFE_INTEGER);
    }

    private stopDistance(poi: Stop, base: GeoLocation): number {
        return getDistance(base, poi.location);
    }

    public updatePOIs(pois: TransitPOI[]): void {
        this.routeMap.update(pois);
        this.invalidateStatus();
    }
}

export interface Status {
    pois: WithDistance<Route | Stop>[]
}

export type WithDistance<T> = T & { distance: number };

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
