import { Given } from "@cucumber/cucumber";
import { LocationAnalyzerWorld } from "../world";

Given<LocationAnalyzerWorld>("I am on a platform", function () {
    this.location = [51.5747889, 7.0311586];
});
