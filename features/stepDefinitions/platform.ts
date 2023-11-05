import { Then } from "@cucumber/cucumber";
import assert from "assert";
import { LocationAnalyzerWorld } from "../world";

Then<LocationAnalyzerWorld>("the id of the nearest platform is {string}", function (id: string) {
    const status = this.locationAnalyzer.getStatus();
    assert.equal(status.stops[0].id, id);
});
