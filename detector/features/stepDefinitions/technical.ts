import { Given } from "@cucumber/cucumber";
import { LocationAnalyzerWorld } from "../world.js";

Given<LocationAnalyzerWorld>("I do not configure any stops initially", function () {
    this.updatePOIs([]);
});

Given<LocationAnalyzerWorld>("I add the OSM stops", function () {
    return this.loadOsmStops();
});

Given<LocationAnalyzerWorld>("I use a location analyzer with the OSM routes and stops", function () {
    return this.loadAllOsmData();
});

Given<LocationAnalyzerWorld>("I use a location analyzer with the OSM data", async function () {
    return this.loadAllOsmData();
});
