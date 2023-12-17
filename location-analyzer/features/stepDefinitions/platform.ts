import { Then } from "@cucumber/cucumber";
import { assert } from "chai";
import { Stop, WithDistance } from "../../dist";
import { LocationAnalyzerWorld } from "../world";

interface RawDataTable { rawTable: string[][] }

Then<LocationAnalyzerWorld>("the id of the nearest platform is {string}", function (id: string) {
    const stop = getFirstStop(this);
    assert.equal(stop.id, id);
});

Then<LocationAnalyzerWorld>("the distance to the nearest platform is {double}m", function (distance: number) {
    const stop = getFirstStop(this);
    assert.equal(stop.distance.value, distance);
});

Then<LocationAnalyzerWorld>("no nearby platforms are detected", function () {
    const status = this.locationAnalyzer.getStatus();
    assert.equal(status.pois.length, 0);
});

Then<LocationAnalyzerWorld>("the ids of the nearest platforms are:", function (dataTable: RawDataTable) {
    const status = this.locationAnalyzer.getStatus();
    const relevantSlice = status.pois.slice(0, dataTable.rawTable.length);
    const ids = relevantSlice.map(stop => stop.id);
    const expectedIds = dataTable.rawTable.map(row => row[0]);
    assert.deepEqual(ids, expectedIds);
});

function getFirstStop(world: LocationAnalyzerWorld): WithDistance<Stop> {
    const status = world.locationAnalyzer.getStatus();
    const stop = status.pois[0] as WithDistance<Stop>;
    assert.isDefined(stop, "No stop found");
    return stop;
}
