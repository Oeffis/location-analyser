import { Then } from "@cucumber/cucumber";
import { assert } from "chai";
import { LocationAnalyzerWorld } from "../world.js";
import { getNearestPlatform } from "./helpers/getNearestPlatform.js";

interface RawDataTable { rawTable: string[][] }

Then<LocationAnalyzerWorld>("the id of the nearest platform is {string}", function (id: string) {
    const stop = getNearestPlatform(this);
    assert.equal(stop.poi.id, id);
});

Then<LocationAnalyzerWorld>("the distance to the nearest platform is {double}m", function (distance: number) {
    // as most stops are not points, but ways, you will likely want to use the 'less than' step definition
    const stop = getNearestPlatform(this);
    assert.equal(stop.distance.value, distance);
});

Then<LocationAnalyzerWorld>("the distance to the nearest platform is less than {double}m", function (distance: number) {
    const stop = getNearestPlatform(this);
    assert.isOk(stop.distance.value < distance);
});

Then<LocationAnalyzerWorld>("no nearby platforms are detected", function () {
    const status = this.locationAnalyzer.getStatus();
    assert.equal(status.nearbyPlatforms.length, 0);
});

Then<LocationAnalyzerWorld>("the ids of the nearest platforms are:", function (dataTable: RawDataTable) {
    const status = this.locationAnalyzer.getStatus();
    const relevantSlice = status.nearbyPlatforms.slice(0, dataTable.rawTable.length);
    const ids = relevantSlice.map(stop => stop.poi.id);
    const expectedIds = dataTable.rawTable.map(row => row[0]);
    assert.deepEqual(ids, expectedIds);
});
