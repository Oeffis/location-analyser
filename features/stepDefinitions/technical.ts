import { Given } from "@cucumber/cucumber";
import { getVrrStops } from "../../src/getVrrStops";
import { LocationAnalyzer } from "../../src/locationAnalyzer";
import { LocationAnalyzerWorld } from "../world";

Given<LocationAnalyzerWorld>("I do not configure any stops initially", function () {
    this.locationAnalyzer = new LocationAnalyzer();
});

Given<LocationAnalyzerWorld>("I add the VRR stops", async function () {
    this.locationAnalyzer.updateStops(await getVrrStops());
});

Given<LocationAnalyzerWorld>("I use a location analyzer with the VRR stops", async function () {
    this.locationAnalyzer = await LocationAnalyzer.forVRR();
});
