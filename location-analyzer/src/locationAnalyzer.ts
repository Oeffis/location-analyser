import { getDistance } from "geolib";
import { DistanceCalculator } from "./distanceCalculator.js";
import { TransitPOI, isRoute } from "./routeMap.js";

export class LocationAnalyzer {
    protected status?: Status;
    protected readonly bufferLimit = 10;
    protected statusHistory: Status[] = [];
    protected locationHistory: GeoLocation[] = [];
    protected readonly distanceCalculator = new DistanceCalculator();

    public constructor(
        pois: TransitPOI[] = [],
    ) {
        this.updatePOIs(pois);
    }

    public updateLocation(location: GeoLocation): void {
        this.locationHistory.push(location);
        if (this.locationHistory.length > this.bufferLimit) {
            this.locationHistory.shift();
        }
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
        const currentLocation = this.locationHistory[this.locationHistory.length - 1];
        if (currentLocation === undefined) { return { pois: [] }; }

        const poisWithDistance = this.distanceCalculator.getSortedPOIsAt(currentLocation);

        const lastLocation = this.locationHistory[this.locationHistory.length - 2];
        if (lastLocation === undefined) {
            const status = { pois: poisWithDistance };
            this.updateStatusHistory(status);
            return status;
        }

        const lastPoisWithDistance = this.distanceCalculator.getSortedPOIsAt(lastLocation);

        const rightDirectionPois = poisWithDistance.filter(poi => {
            const lastPoi = lastPoisWithDistance.find(lastPoi => lastPoi.poi.id === poi.poi.id);
            if (lastPoi === undefined) {
                return true;
            }

            if (isRouteDistance(poi) && isRouteDistance(lastPoi)) {
                const atSameSection = poi.distance.section === lastPoi.distance.section;
                if (atSameSection) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const sectionEnd = poi.poi.sections[poi.distance.consecutiveSection]![poi.distance.section]!;
                    const lastDistanceToSectionEnd = getDistance(lastLocation, sectionEnd);
                    const currentDistanceToSectionEnd = getDistance(currentLocation, sectionEnd);
                    return currentDistanceToSectionEnd < lastDistanceToSectionEnd;
                } else {
                    return poi.distance.section > lastPoi.distance.section;
                }
            }
            return true;
        });

        const status = { pois: rightDirectionPois };
        this.updateStatusHistory(status);
        return status;
    }

    protected updateStatusHistory(status: Status): void {
        this.statusHistory.push(status);
        if (this.statusHistory.length > this.bufferLimit) {
            this.statusHistory.shift();
        }
    }

    public updatePOIs(pois: TransitPOI[]): void {
        this.distanceCalculator.updatePOIs(pois);
        this.invalidateStatus();
    }
}

export function isRouteDistance(poi: POIWithDistance): poi is RouteWithDistance {
    return isRoute(poi.poi);
}

export interface Status {
    pois: POIWithDistance[]
}

interface SectionDistance {
    poiId: string;
    consecutiveSection: number;
    section: number;
    value: number;
}

interface StopDistance {
    poiId: string;
    value: number;
}

export type DistanceTypeOf<T extends TransitPOI> = T extends Route ? SectionDistance : StopDistance;

export type POIWithDistance = StopWithDistance | RouteWithDistance;

export interface StopWithDistance {
    poi: Stop;
    distance: StopDistance;
}

export interface RouteWithDistance {
    poi: Route;
    distance: SectionDistance;
}

export interface Stop {
    id: string;
    name: string;
    boundaries: Omit<GeoLocation, "altitude">[];
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
    sections: Section[][];
}

export interface Section {
    routeId: string;
    sequence: number;
    lat: number;
    lon: number;
}
