import { getDistance } from "geolib";
import { getDistanceFromLine } from "./getDistanceFromLine";
import { RouteMap, TransitPOI, isRoute } from "./routeMap";

interface SectionDistance {
    poiId: string;
    section: number;
    value: number;
}

interface StopDistance {
    poiId: string;
    value: number;
}

type Distance = SectionDistance | StopDistance;

export class LocationAnalyzer {
    protected status?: Status;
    protected routeMap = new RouteMap();
    protected readonly bufferLimit = 10;
    protected statusHistory: Status[] = [];
    protected locationHistory: GeoLocation[] = [];

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

        const poisWithDistance = this.getSortedPOIsAt(currentLocation);

        // const lastLocation = this.locationHistory[this.locationHistory.length - 2];
        // if (lastLocation === undefined) {
        //     this.updateStatusHistory({ pois: [] });
        //     return { pois: [] };
        // }

        // const lastPoisWithDistance = this.getSortedPOIsAt(lastLocation);

        // const rightDirectionPois = poisWithDistance.filter(poi => {
        //     const lastPoi = lastPoisWithDistance.find(lastPoi => lastPoi.id === poi.id);
        //     if (lastPoi === undefined) {
        //         return true;
        //     }

        //     if (isRoute(poi) && isRoute(lastPoi)) {
        //         const atSameSection = (poi.distance as SectionDistance).section === (lastPoi.distance as SectionDistance).section;
        //         if (atSameSection) {
        //             // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        //             const sectionEnd = poi.sections[(poi.distance as SectionDistance).section]!;
        //             return getDistance(currentLocation, sectionEnd) < getDistance(lastLocation, sectionEnd);
        //         } else {
        //             return (poi.distance as SectionDistance).section > (lastPoi.distance as SectionDistance).section;
        //         }
        //     }
        // });

        const status = { pois: poisWithDistance };
        this.updateStatusHistory(status);
        return status;
    }

    public getSortedPOIsAt(currentLocation: GeoLocation): POIWithDistance[] {
        const nearbyPOIs = this.routeMap.getPOIsAtLocation(currentLocation);
        const poisWithDistance = nearbyPOIs
            .map(poi => this.withDistance(currentLocation, poi))
            .sort((a, b) => a.distance.value - b.distance.value);
        return poisWithDistance;
    }

    protected withDistance<T extends Stop | Route>(base: GeoLocation, poi: T): T & { distance: Distance } {
        const distance = this.distance(base, poi);
        return { ...poi, distance };
    }

    protected distance<T extends Stop | Route>(base: GeoLocation, poi: T): Distance {
        if (isRoute(poi)) {
            return this.routeDistance(poi, base);
        }
        return this.stopDistance(poi, base);
    }

    private routeDistance(poi: Route, base: GeoLocation): SectionDistance {
        const distance = poi.sections.reduce((min, section, index, sections) => {
            const previous = sections[index - 1];
            if (previous === undefined) {
                return min;
            }
            const value = getDistanceFromLine(base, {
                lat: section.lat,
                lon: section.lon
            }, {
                lat: previous.lat,
                lon: previous.lon
            }, 0.1);

            if (value < min.value) {
                return {
                    section: index,
                    value
                };
            }
            return min;
        }, {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            section: -1,
            value: Number.MAX_SAFE_INTEGER
        });

        return {
            poiId: poi.id,
            section: distance.section,
            value: distance.value
        };
    }

    private stopDistance(poi: Stop, base: GeoLocation): StopDistance {
        return { poiId: poi.id, value: getDistance(base, poi.location) };
    }

    protected updateStatusHistory(status: Status): void {
        this.statusHistory.push(status);
        if (this.statusHistory.length > this.bufferLimit) {
            this.statusHistory.shift();
        }
    }

    public updatePOIs(pois: TransitPOI[]): void {
        this.routeMap.update(pois);
        this.invalidateStatus();
    }
}

export interface Status {
    pois: POIWithDistance[]
}

export type WithDistance<T> = T & { distance: Distance };
export type POIWithDistance = TransitPOI & { distance: Distance };

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
