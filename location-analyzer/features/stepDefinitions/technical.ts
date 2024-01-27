import { Given } from "@cucumber/cucumber";
import { LocationAnalyzerWorld } from "../world.js";

Given<LocationAnalyzerWorld>("I do not configure any stops initially", function () {
    this.updatePOIs([]);
});

Given<LocationAnalyzerWorld>("I add the VRR stops", function () {
    return this.loadVrrStops();
});

Given<LocationAnalyzerWorld>("I use a location analyzer with the VRR routes and stops", function () {
    return this.loadAllVrrData();
});

Given<LocationAnalyzerWorld>("I use a location analyzer with the VRR data", async function () {
    return this.loadAllVrrData();
});
