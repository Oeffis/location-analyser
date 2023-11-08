import { Given } from "@cucumber/cucumber";
import { LocationAnalyzer } from "../../src/locationAnalyzer";
import { LocationAnalyzerWorld } from "../world";

Given<LocationAnalyzerWorld>("I do not configure any stops initially", function () {
    this.locationAnalyzer = new LocationAnalyzer();
});
