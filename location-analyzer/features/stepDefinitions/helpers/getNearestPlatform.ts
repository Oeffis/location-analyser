import { assert } from "chai";
import { StopWithDistance } from "../../../src/locationAnalyzer.js";
import { LocationAnalyzerWorld } from "../../world.js";

export function getNearestPlatform(world: LocationAnalyzerWorld): StopWithDistance {
    const status = world.locationAnalyzer.getStatus();
    const stop = status.nearbyPlatforms[0];
    assert.isDefined(stop, "No stop found");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return stop!;
}
