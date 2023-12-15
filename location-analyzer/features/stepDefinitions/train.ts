import { Given, Then, When } from "@cucumber/cucumber";
import { LocationAnalyzerWorld } from "../world";

import { Stop } from "@oeffis/location-analyzer";
import { assert } from "chai";
import { Route, getVrrRoutes } from "../getVrrRoutes.js";
import { getVrrStops } from "../getVrrStops.js";

Given<LocationAnalyzerWorld>("the 302 travels on a separate track in each direction north of Veltins Arena", async function () {
    const TRAM_302_LANGENDREER_TO_BUER = "572234368";
    const TRAM_302_BUER_TO_LANGENDREER = "3720902989";

    // 302 serves this line twice in this direction, with different start locations. As this currently cannot be detected, we filter out these to the others will be detected.
    const hasNoDuplicateAtThisLocation = (route: Route | Stop): boolean => ![
        TRAM_302_LANGENDREER_TO_BUER,
        TRAM_302_BUER_TO_LANGENDREER
    ].includes(route.id);

    const routes = [
        ...await getVrrStops(),
        ...(await getVrrRoutes()).filter(hasNoDuplicateAtThisLocation)
    ];
    this.locationAnalyzer.updatePOIs(routes);
});

When<LocationAnalyzerWorld>("I am on the 302 to Buer Rathaus North of Veltins Arena", function () {
    this.locationAnalyzer.updateLocation({
        latitude: 51.55826,
        longitude: 7.06077
    });
});

Then<LocationAnalyzerWorld>("the detected train is the {string} to {string}", function (line: string, destination: string) {
    const status = this.locationAnalyzer.getStatus();
    const route = status.pois[0] as Route;
    assert.strictEqual(route.ref, line);
    assert.strictEqual(route.to, destination);
});
