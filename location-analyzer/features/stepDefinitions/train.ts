import { Then, When } from "@cucumber/cucumber";
import { LocationAnalyzerWorld } from "../world";

import assert from "assert";
import { getVrrRoutes } from "../getVrrRoutes";

const TRAM_302_LANGENDREER_TO_BUER = "572234368";
const TRAM_302_OWERK_TO_BUER = "64627576270";

When<LocationAnalyzerWorld>("I am on a train that travels on a separate track in each direction", async function () {
    const vrrRoutes = await getVrrRoutes();
    this.expectedRoutes = vrrRoutes.filter(route =>
        [TRAM_302_LANGENDREER_TO_BUER, TRAM_302_OWERK_TO_BUER].includes(route.id)
    );

    // Set location on track near Veltins-Arena, where tracks have great separation
    this.locationAnalyzer.updateLocation({
        latitude: 51.55880,
        longitude: 7.06044
    });
});

Then<LocationAnalyzerWorld>("the train I am on is detected", function () {
    assert.deepEqual(this.locationAnalyzer.getStatus().routes, this.expectedRoutes);
});
