import { Then } from "@cucumber/cucumber";
import { assert } from "chai";
import { StopWithDistance } from "../../src/locationAnalyzer.js";
import { LocationAnalyzerWorld } from "../world.js";

interface RawDataTable { rawTable: string[][] }

Then<LocationAnalyzerWorld>("the id of the nearest platform is {string}", function (id: string) {
    const stop = getFirstStop(this);
    assert.equal(stop.poi.id, id);
});

Then<LocationAnalyzerWorld>("the distance to the nearest platform is {double}m", function (distance: number) {
    // as most stops are not points, but ways, you will likely want to use the 'less than' step definition
    const stop = getFirstStop(this);
    assert.equal(stop.distance.value, distance);
});

Then<LocationAnalyzerWorld>("the distance to the nearest platform is less than {double}m", function (distance: number) {
    const stop = getFirstStop(this);
    assert.isOk(stop.distance.value < distance);
});

Then<LocationAnalyzerWorld>("no nearby platforms are detected", function () {
    const status = this.locationAnalyzer.getStatus();
    assert.equal(status.pois.length, 0);
});

Then<LocationAnalyzerWorld>("the ids of the nearest platforms are:", function (dataTable: RawDataTable) {
    const status = this.locationAnalyzer.getStatus();
    const relevantSlice = status.pois.slice(0, dataTable.rawTable.length);
    const ids = relevantSlice.map(stop => stop.poi.id);
    const expectedIds = dataTable.rawTable.map(row => row[0]);
    assert.deepEqual(ids, expectedIds);
});

function getFirstStop(world: LocationAnalyzerWorld): StopWithDistance {
    const status = world.locationAnalyzer.getStatus();
    const stop = status.pois[0] as StopWithDistance;
    assert.isDefined(stop, "No stop found");
    return stop;
}
