import { Then } from "@cucumber/cucumber";
import assert from "assert";
import { LocationAnalyzerWorld } from "../world";

Then<LocationAnalyzerWorld>("the id of the nearest platform is {string}", function (id: string) {
    const status = this.locationAnalyzer.getStatus();
    assert.equal(status.stops[0].id, id);
});

Then<LocationAnalyzerWorld>("the distance to the nearest platform is {double}m", function (distance: number) {
    const status = this.locationAnalyzer.getStatus();
    assert.equal(status.stops[0].distance, distance);
});

Then<LocationAnalyzerWorld>("no nearby platforms are detected", function () {
    const status = this.locationAnalyzer.getStatus();
    assert.equal(status.stops.length, 0);
});
