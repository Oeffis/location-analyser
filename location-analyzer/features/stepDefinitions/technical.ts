import { Given } from "@cucumber/cucumber";
import { LocationAnalyzer } from "../../src/locationAnalyzer.js";
import { getVrrStops } from "../getVrrStops.js";
import { LocationAnalyzerWorld } from "../world.js";

Given<LocationAnalyzerWorld>("I do not configure any stops initially", function () {
    this.locationAnalyzer = new LocationAnalyzer();
});

Given<LocationAnalyzerWorld>("I add the VRR stops", async function () {
    this.locationAnalyzer.updatePOIs(await getVrrStops());
});

Given<LocationAnalyzerWorld>("I use a location analyzer with the VRR data", async function () {
    this.locationAnalyzer = new LocationAnalyzer(await getVrrStops());
});
