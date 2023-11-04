import { When } from "@cucumber/cucumber";
import * as assertion from "node:assert/strict";
import { getStatus } from "../../src";
import { LocationAnalyzerWorld } from "../world";

When<LocationAnalyzerWorld>("I check for my current status", function () {
    assertion.ok(this.location, "Location is not set");

    this.status = getStatus(this.location);
});
