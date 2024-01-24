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

        const poisWithDistance = this.distanceCalculator.getPOIsAt(currentLocation)
            .filter(poi => !currentLocation.accuracy || poi.distance.value < currentLocation.accuracy * 2);

        const rightDirectionPois = this.filterWrongDirectionPois(poisWithDistance);
        const sortedPOIs = rightDirectionPois
            .map(poi => this.withAge(poi))
            .sort((a, b) => {
                const diff = b.age - a.age;
                if (diff !== 0) return diff;
                return a.distance.value - b.distance.value;
            });

        const status = {
            location: currentLocation,
            pois: sortedPOIs
        };
        this.updateStatusHistory(status);
        return status;
    }

    private withAge(poi: POIWithDistance): POIWithDistanceAndAge {
        const lastOccurrence = this.statusHistory[this.statusHistory.length - 1]?.pois.find(lastPoi => lastPoi.poi.id === poi.poi.id);
        const age = lastOccurrence ? lastOccurrence.age + 1 : 1;
        return {
            ...poi,
            age
        };
    }

    protected filterWrongDirectionPois(pois: POIWithDistance[]): POIWithDistance[] {
        const currentLocation = this.locationHistory[this.locationHistory.length - 1];
        const lastLocation = this.locationHistory[this.locationHistory.length - 2];
        if (lastLocation === undefined) {
            return pois;
        }
        let lastPoisWithDistance: POIWithDistance[] = [];
        lastPoisWithDistance = this.distanceCalculator.getPOIsAt(lastLocation);

        return pois.filter(isStopOrRightDirection);

        function isStopOrRightDirection(poi: POIWithDistance): boolean {
            if (isStopDistance(poi)) return true;
            if (currentLocation === undefined) return true;
            if (lastLocation === undefined) return true;

            const lastPoi = lastPoisWithDistance
                .find(lastPoi => lastPoi.poi.id === poi.poi.id) as RouteWithDistance | undefined;
            if (lastPoi === undefined) return true;

            const atSameSection = poi.distance.section === lastPoi.distance.section;
            if (atSameSection) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const sectionEnd = poi.poi.sections[poi.distance.consecutiveSection]![poi.distance.section]!;
                const lastDistanceToSectionEnd = getDistance(lastLocation, sectionEnd);
                const currentDistanceToSectionEnd = getDistance(currentLocation, sectionEnd);
                return currentDistanceToSectionEnd < lastDistanceToSectionEnd;
            }

            return poi.distance.section > lastPoi.distance.section;
        }
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

export function isStopDistance(poi: POIWithDistance): poi is StopWithDistance {
    return !isRoute(poi.poi);
}

export type Status = NoResultStatus | ResultStatus;

export interface NoResultStatus {
    pois: [];
}

export interface ResultStatus {
    location: GeoLocation;
    pois: POIWithDistanceAndAge[]
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
export type POIWithDistanceAndAge = POIWithDistance & { age: number };

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
    accuracy?: number;
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
