import { Then } from "@cucumber/cucumber";
import assert from "assert";
import { getStatus } from "../../src/index";
import { LocationAnalyzerWorld } from "../world";

Then<LocationAnalyzerWorld>("the id of the nearest platform is {string}", function (id: string) {
    assert.ok(this.location);
    const status = getStatus(this.location);
    assert.equal(status.stops[0].id, id);
});
