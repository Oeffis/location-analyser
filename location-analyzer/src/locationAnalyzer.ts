import { getDistance } from "geolib";

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
        return {
            stops: sortedStops, routes: this.routes.filter(route =>
                route.id == "572234368" || route.id == "64627576270"
            )
        };
    }

    public updateStops(stops: Stop[]): void {
        this.stops = stops;
        this.invalidateStatus();
    }
}

export interface Status {
    stops: StatusStop[];
    routes: Route[];
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

export interface Section {
    routeId: string;
    sequence: number;
    lat: number;
    lon: number;
}
