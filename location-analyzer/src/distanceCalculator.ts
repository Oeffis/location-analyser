import { getDistanceFromLine, isPointInPolygon } from "geolib";
import { GeoLocation, Route, Stop } from "./locationAnalyzer.js";
import { RouteMap, TransitPOI, isRoute } from "./routeMap.js";

export class DistanceCalculator {
    protected routeMap = new RouteMap();

    public getSortedPOIsAt(currentLocation: GeoLocation): POIWithDistance[] {
        const nearbyPOIs = this.routeMap.getPOIsAtLocation(currentLocation);
        return nearbyPOIs
            .map(poi => this.withDistance(currentLocation, poi))
            .filter(poi => !currentLocation.accuracy || poi.distance.value < currentLocation.accuracy * 2)
            .sort((a, b) => a.distance.value - b.distance.value);
    }

    protected withDistance<T extends Stop | Route>(base: GeoLocation, poi: T): StopWithDistance | RouteWithDistance {
        if (isRoute(poi)) {
            return {
                poi,
                distance: this.routeDistance(poi, base)
            };
        }
        return {
            poi,
            distance: this.stopDistance(poi, base)
        };
    }

    private routeDistance(poi: Route, base: GeoLocation): SectionDistance {
        const distance = poi.sections.reduce((min, consecutiveSection, consecutiveSectionIndex) =>
            consecutiveSection.reduce((min, section, index, sections) => {
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
                        consecutiveSection: consecutiveSectionIndex,
                        section: index,
                        value
                    };
                }
                return min;
            }, min), {
            consecutiveSection: -1,
            section: -1,
            value: Number.MAX_SAFE_INTEGER
        });

        return {
            poiId: poi.id,
            section: distance.section,
            consecutiveSection: distance.consecutiveSection,
            value: distance.value
        };
    }

    private stopDistance(poi: Stop, base: GeoLocation): StopDistance {
        if (isPointInPolygon(base, poi.boundaries.map(boundary => ({ latitude: boundary.latitude, longitude: boundary.longitude })))) {
            return {
                poiId: poi.id,
                value: 0
            };
        }

        return poi.boundaries.reduce((min, location, index, locations) => {
            const next = locations[index + 1];
            if (next === undefined) {
                return min;
            }

            const value = getDistanceFromLine(base, {
                lat: location.latitude,
                lon: location.longitude
            }, {
                lat: next.latitude,
                lon: next.longitude
            }, 0.1);
            if (value < min.value) {
                return {
                    poiId: poi.id,
                    value
                };
            }
            return min;
        }, {
            poiId: poi.id,
            value: Number.MAX_SAFE_INTEGER
        });
    }

    public updatePOIs(pois: TransitPOI[]): void {
        this.routeMap.update(pois);
    }
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
