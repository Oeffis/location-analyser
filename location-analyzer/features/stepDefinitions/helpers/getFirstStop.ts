import { assert } from "chai";
import { StopWithDistance } from "../../../src/locationAnalyzer.js";
import { LocationAnalyzerWorld } from "../../world.js";

export function getFirstStop(world: LocationAnalyzerWorld): StopWithDistance {
    const status = world.locationAnalyzer.getStatus();
    const stop = status.pois[0] as StopWithDistance;
    assert.isDefined(stop, "No stop found");
    return stop;
}
