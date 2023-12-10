import { getDistance } from "geolib";
import { GeolibInputCoordinates } from "geolib/es/types";

export class LocationAnalyzer {
    private currentLocation?: GeoLocation;
    private status?: Status;

    public constructor(
        private stops: Stop[] = [],
        private routes: Route[] = []
    ) { }

    public updateLocation(location?: GeoLocation): void {
        this.currentLocation = location;
        this.invalidateStatus();
    }

    private invalidateStatus(): void {
        this.status = undefined;
    }

    public getStatus(): Status {
        this.status = this.status ?? this.calculateStatus();
        return this.status;
    }

    private calculateStatus(): Status {
        const currentLocation = this.currentLocation;
        if (!currentLocation) {
            return {
                stops: [],
                routes: []
            };
        }

        const sortedStops = this.stops
            .map(stop => ({
                id: stop.id,
                distance: getDistance(currentLocation, stop.location)
            }))
            .sort((a, b) => a.distance - b.distance);

        const sortedRoutes = this.routes
            .map(route => ({
                ...route,
                distance: route.sections.reduce((minDistance, section, index, sections) => {
                    if (index === sections.length - 1) {
                        return minDistance;
                    }
                    return Math.min(minDistance, getDistanceFromLine(currentLocation, {
                        latitude: section.lat,
                        longitude: section.lon
                    }, {
                        latitude: sections[index + 1]?.lat,
                        longitude: sections[index + 1]?.lon
                    },
                        0.1
                    ));
                }, Number.MAX_SAFE_INTEGER)
            })).sort((a, b) => a.distance - b.distance);
        const slicedRoutes = sortedRoutes.slice(0, 2);
        return {
            stops: sortedStops,
            routes: slicedRoutes
        };
    }

    public updateStops(stops: Stop[]): void {
        this.stops = stops;
        this.invalidateStatus();
    }
}

export interface Status {
    stops: StatusStop[];
    routes: StatusRoute[];
}

export interface StatusStop {
    id: string;
    distance: number;
}

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

export type StatusRoute = Route & { distance: number };

export interface Section {
    routeId: string;
    sequence: number;
    lat: number;
    lon: number;
}

// Returns the minimum distance from a point to a line
const getDistanceFromLine = (
    point: GeolibInputCoordinates,
    lineStart: GeolibInputCoordinates,
    lineEnd: GeolibInputCoordinates,
    accuracy = 1
): number => {
    const d1 = getDistance(lineStart, point, accuracy);
    const d2 = getDistance(point, lineEnd, accuracy);
    const d3 = getDistance(lineStart, lineEnd, accuracy);

    // alpha is the angle between the line from start to point, and from start to end
    const alpha = Math.acos(
        robustAcos((d1 * d1 + d3 * d3 - d2 * d2) / (2 * d1 * d3))
    );

    // beta is the angle between the line from end to point and from end to start //
    const beta = Math.acos(
        robustAcos((d2 * d2 + d3 * d3 - d1 * d1) / (2 * d2 * d3))
    );

    const pointAtLineStart = d1 === 0;
    const pointAtLineEnd = d2 === 0;
    if (pointAtLineStart || pointAtLineEnd) {
        return 0;
    }

    const lineLengthZero = d3 === 0;
    if (lineLengthZero) {
        return d1;
    }

    // if the angle is greater than 90 degrees, then the minimum distance is the
    // line from the start to the point
    if (alpha > Math.PI / 2) {
        return d1;
    }

    if (beta > Math.PI / 2) {
        // same for the beta
        return d2;
    }

    // console.log(Math.sin(alpha), Math.sin(alpha) * d1);

    // otherwise the minimum distance is achieved through a line perpendicular
    // to the start-end line, which goes from the start-end line to the point
    return Math.sin(alpha) * d1;
};

const robustAcos = (value: number): number => {
    if (value > 1) {
        return 1;
    }
    if (value < -1) {
        return -1;
    }

    return value;
};
