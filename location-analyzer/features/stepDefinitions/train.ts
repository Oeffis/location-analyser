import { Given, Then, When } from "@cucumber/cucumber";
import { LocationAnalyzerWorld } from "../world";

import { assert } from "chai";
import { LocationAnalyzer, Route, RouteWithDistance, Stop, isRouteDistance } from "../../src/locationAnalyzer.js";
import { Route as VrrRoute, getVrrRoutes } from "../getVrrRoutes.js";
import { getVrrStops } from "../getVrrStops.js";

Given<LocationAnalyzerWorld>("the 302 travels on a separate track in each direction north of Veltins Arena", async function () {
    const TRAM_302_LANGENDREER_TO_BUER = "572234368";
    const TRAM_302_BUER_TO_LANGENDREER = "3720902989";

    // 302 serves this line twice in this direction, with different start locations. As this currently cannot be detected, we filter out these to the others will be detected.
    const hasNoDuplicateAtThisLocation = (route: VrrRoute | Stop): boolean => ![
        TRAM_302_LANGENDREER_TO_BUER,
        TRAM_302_BUER_TO_LANGENDREER
    ].includes(route.id);

    const routes = [
        ...await getVrrStops(),
        ...(await getVrrRoutes()).filter(hasNoDuplicateAtThisLocation)
    ];
    this.locationAnalyzer.updatePOIs(routes);
});

Given<LocationAnalyzerWorld>("the RB43 travels on a single track between Buer Süd and Zoo", async function () {
    await loadAllRoutesTo(this.locationAnalyzer);
});

Given<LocationAnalyzerWorld>("the S9 to Wuppertal leaves the area between Gladback and Essen", async function () {
    await loadAllRoutesTo(this.locationAnalyzer);
});

Given<LocationAnalyzerWorld>("the Lines 399 and 342 split at the start of the Neidenburger Straße", async function () {
    await loadAllRoutesTo(this.locationAnalyzer);
});

Given<LocationAnalyzerWorld>("I traveled from the Westfälische Hochschule to the Neidenburger Straße", function () {
    const points = [
        [51.57478, 7.03116, 4.0],
        [51.57467, 7.03106, 4.0],
        [51.57406, 7.03208, 4.0],
        [51.57278, 7.03335, 4.0]
    ];

    for (const point of points) {
        this.locationAnalyzer.updateLocation({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            latitude: point[0]!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            longitude: point[1]!,
            accuracy: point[2]
        });
        this.locationAnalyzer.getStatus();
    }
});

Given<LocationAnalyzerWorld>("the RE2 stops at platform 7 of Gelsenkirchen Hbf", async function () {
    const data = await Promise.all([getVrrStops(), getVrrRoutes()]);
    this.locationAnalyzer.updatePOIs(data.flat());
});

When<LocationAnalyzerWorld>("I am on the 302 to Buer Rathaus North of Veltins Arena", function () {
    this.locationAnalyzer.updateLocation({
        latitude: 51.55826,
        longitude: 7.06077
    });
});

When<LocationAnalyzerWorld>("I am on the RB43 between Buer Süd and Zoo", function () {
    this.locationAnalyzer.updateLocation({
        latitude: 51.5393,
        longitude: 7.07059
    });
});

When<LocationAnalyzerWorld>("I am traveling in the direction of Zoo", function () {
    this.locationAnalyzer.updateLocation({
        latitude: 51.53879,
        longitude: 7.07231
    });
});

When<LocationAnalyzerWorld>("I move along the area edge between Gladback and Essen", function () {
    this.locationAnalyzer.updateLocation({
        latitude: 51.5857704,
        longitude: 7.000457
    });

    this.locationAnalyzer.updateLocation({
        latitude: 51.4500238,
        longitude: 7.0000507
    });
});

When<LocationAnalyzerWorld>("I am on the S9 to Wuppertal between Essen and Wuppertal", function () {
    this.locationAnalyzer.updateLocation({
        latitude: 51.34504,
        longitude: 7.10074
    });
});

When<LocationAnalyzerWorld>("I am on the RE2 at platform 7 of Gelsenkirchen Hbf", function () {
    this.locationAnalyzer.updateLocation({
        latitude: 51.5048071,
        longitude: 7.1028557
    });
});

When<LocationAnalyzerWorld>("I travel further along the route of the 399", function () {
    this.locationAnalyzer.updateLocation({
        latitude: 51.57285,
        longitude: 7.03356,
        accuracy: 4.0
    });

    this.locationAnalyzer.getStatus();

    this.locationAnalyzer.updateLocation({
        latitude: 51.57287,
        longitude: 7.03364,
        accuracy: 4.0
    });
});

Then<LocationAnalyzerWorld>("the detected train is the {string} to {string}", function (line: string, destination: string) {
    const route = getFirstRoute(this);
    assert.strictEqual(route.ref, line);
    assert.strictEqual(route.to, destination);
});

Then<LocationAnalyzerWorld>("one of the detected trains is the {string} to {string}", function (line: string, destination: string) {
    const exists = this.locationAnalyzer.getStatus().pois.some((poi) => {
        if (isRouteDistance(poi)) {
            return poi.poi.ref === line && poi.poi.to === destination;
        }
        return false;
    });
    assert.isTrue(exists, `The train ${line} to ${destination} is not detected, but should be. Options were ` + this.locationAnalyzer.getStatus().pois.map((poi) => {
        if (isRouteDistance(poi)) {
            return `${poi.poi.ref} to ${poi.poi.to}`;
        }
        return poi.poi.name;
    }).join(", "));
});

Then<LocationAnalyzerWorld>("the train {string} to {string} is not detected", function (line: string, destination: string) {
    const route = getFirstRoute(this);

    const sameLine = route.ref === line;
    const sameDestination = route.to === destination;
    assert.isFalse(sameLine && sameDestination, `The train ${line} to ${destination} is detected, but should not be.`);
});

async function loadAllRoutesTo(locationAnalyzer: LocationAnalyzer): Promise<void> {
    const allRoutes = await getVrrRoutes();
    locationAnalyzer.updatePOIs(allRoutes);
}

function getFirstRoute(world: LocationAnalyzerWorld): Route {
    const status = world.locationAnalyzer.getStatus();
    const route = status.pois[0] as RouteWithDistance;
    assert.exists(route, "There is no route to check against.");
    return route.poi;
}
