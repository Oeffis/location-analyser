import { GeoPosition } from "../../../src/locationAnalyzer.js";

export const locationMap: Record<string, { location: GeoPosition; id?: string; }> = {
    /* eslint-disable @typescript-eslint/naming-convention */
    "GE Westfälische Hochschule": {
        location: {
            latitude: 51.5748126,
            longitude: 7.0311269,
            accuracy: 4
        }
    },
    "Gelsenkirchen Hbf": {
        location: {
            latitude: 51.5049259,
            longitude: 7.1022064,
            accuracy: 4
        }
    },
    "Platform 7 of Gelsenkirchen Hbf": {
        id: "4250657",
        location: {
            latitude: 51.50483,
            longitude: 7.10283,
            accuracy: 4
        }
    }
    /* eslint-disable @typescript-eslint/naming-convention */
};
