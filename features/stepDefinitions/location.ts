
import { Given } from "@cucumber/cucumber";
import { LocationAnalyzerWorld } from "../world";

const locationMap: Record<string, [number, number]> = {
    /* eslint-disable @typescript-eslint/naming-convention */
    "GE Westfälische Hochschule": [51.5747889, 7.0311586]
    /* eslint-enable @typescript-eslint/naming-convention */
};

Given<LocationAnalyzerWorld>("I am at {string}", function (location: string) {
    this.location = locationMap[location];
});
