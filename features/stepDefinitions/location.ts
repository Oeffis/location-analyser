
import { Given } from "@cucumber/cucumber";
import { LocationAnalyzerWorld } from "../world";

const locationMap: Record<string, [number, number]> = {
    /* eslint-disable @typescript-eslint/naming-convention */
    "GE Westfälische Hochschule": [51.5747889, 7.0311586]
    /* eslint-enable @typescript-eslint/naming-convention */
};

Given<LocationAnalyzerWorld>("I am at {string}", function (location: string) {
    this.locationAnalyzer.updateLocation(locationMap[location]);
});

Given<LocationAnalyzerWorld>("I am {double} m {word} of {string}", function (distance: number, direction: string, location: string) {
    let [latitude, longitude] = locationMap[location];
    switch (direction) {
        case "north":
            latitude += distance / 111111;
            break;
        case "east":
            longitude += Math.cos(latitude) * distance / 111111;
            break;
        case "south":
            latitude -= distance / 111111;
            break;
        case "west":
            longitude -= Math.cos(latitude) * distance / 111111;
            break;
        default:
            throw new Error(`Unknown direction: ${direction}`);
    }
    console.log(`I am at ${latitude}, ${longitude}`);
    this.locationAnalyzer.updateLocation([latitude, longitude]);
});

Given<LocationAnalyzerWorld>("No location was set", function () {
    this.locationAnalyzer.updateLocation(undefined);
});
