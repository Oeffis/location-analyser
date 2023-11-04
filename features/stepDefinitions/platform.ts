import { Then } from "@cucumber/cucumber";
import assert from "assert";
import { LocationAnalyzerWorld } from "../world";

Then<LocationAnalyzerWorld>("the current platform is detected", function () {
    assert.ok(this.status, "Status is not set");
    assert.equal(this.status.stops[0].id, "de:05513:6762:0:01");
});
