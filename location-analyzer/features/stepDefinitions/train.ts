import { Given, Then, When } from "@cucumber/cucumber";
import { LocationAnalyzerWorld } from "../world";

import { assert } from "chai";
import { RouteWithDistance } from "../../src/distanceCalculator";
import { LocationAnalyzer, Route, Stop, isRouteDistance } from "../../src/locationAnalyzer.js";
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
        this.locationAnalyzer.updatePosition({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            latitude: point[0]!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            longitude: point[1]!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            accuracy: point[2]!
        });
    }
});

Given<LocationAnalyzerWorld>("the RE2 stops at platform 7 of Gelsenkirchen Hbf", async function () {
    const data = await Promise.all([getVrrStops(), getVrrRoutes()]);
    this.locationAnalyzer.updatePOIs(data.flat());
});

When<LocationAnalyzerWorld>("I am on the 302 to Buer Rathaus North of Veltins Arena", function () {
    this.locationAnalyzer.updatePosition({
        latitude: 51.55826,
        longitude: 7.06077,
        accuracy: 4.0
    });
});

When<LocationAnalyzerWorld>("I am on the RB43 between Buer Süd and Zoo", function () {
    this.locationAnalyzer.updatePosition({
        latitude: 51.5393,
        longitude: 7.07059,
        accuracy: 4.0
    });
});

When<LocationAnalyzerWorld>("I am traveling in the direction of Zoo", function () {
    this.locationAnalyzer.updatePosition({
        latitude: 51.53879,
        longitude: 7.07231,
        accuracy: 4.0
    });
});

When<LocationAnalyzerWorld>("I move along the area edge between Gladback and Essen", function () {
    this.locationAnalyzer.updatePosition({
        latitude: 51.5857704,
        longitude: 7.000457,
        accuracy: 4.0
    });

    this.locationAnalyzer.updatePosition({
        latitude: 51.4500238,
        longitude: 7.0000507,
        accuracy: 4.0
    });
});

When<LocationAnalyzerWorld>("I am on the S9 to Wuppertal between Essen and Wuppertal", function () {
    this.locationAnalyzer.updatePosition({
        latitude: 51.34504,
        longitude: 7.10074,
        accuracy: 4.0
    });
});

When<LocationAnalyzerWorld>("I am on the RE2 at platform 7 of Gelsenkirchen Hbf", function () {
    this.locationAnalyzer.updatePosition({
        latitude: 51.5048071,
        longitude: 7.1028557,
        accuracy: 4.0
    });
});

When<LocationAnalyzerWorld>("I travel further along the route of the 399", function () {
    this.locationAnalyzer.updatePosition({
        latitude: 51.57275,
        longitude: 7.0334,
        accuracy: 4.0
    });

    this.locationAnalyzer.updatePosition({
        latitude: 51.57287,
        longitude: 7.03364,
        accuracy: 4.0
    });
});

When<LocationAnalyzerWorld>("I travel more than ten seconds further along the route of the 399", function () {
    const points = [
        [51.573638, 7.037283, 4.866884505530313],
        [51.573656, 7.037390, 4.915587848736882],
        [51.573696, 7.037560, 4.92499846848061],
        [51.573691, 7.037711, 5.062668916908621],
        [51.573752, 7.037899, 4.828387381542608],
        [51.573798, 7.038074, 4.843902676245343],
        [51.573852, 7.038265, 4.881109981948338],
        [51.573920, 7.038500, 4.912195635265518],
        [51.573993, 7.038732, 4.899349945251498],
        [51.574058, 7.038974, 4.982346926747279],
        [51.574114, 7.039121, 4.917431233131508],
        [51.574153, 7.039264, 4.905058764644977],
        [51.574192, 7.039401, 4.935274033095836],
        [51.574235, 7.039540, 4.945231253944659],
        [51.574285, 7.039675, 4.984764417087805],
        [51.574342, 7.039819, 4.942540894018994],
        [51.574384, 7.039967, 4.969750869962438],
        [51.574452, 7.040080, 4.923017614056573],
        [51.574526, 7.040214, 4.893513102294873],
        [51.574581, 7.040360, 4.927861019613368],
        [51.574630, 7.040500, 4.92289906128469]
    ];

    for (const point of points) {
        this.locationAnalyzer.updatePosition({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            latitude: point[0]!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            longitude: point[1]!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            accuracy: point[2]!
        });
    }
});

Then<LocationAnalyzerWorld>("the detected train is the {string} to {string}", function (line: string, destination: string) {
    const route = getFirstRoute(this);
    assert.strictEqual(route.ref, line);
    assert.strictEqual(route.to, destination);
});

Then<LocationAnalyzerWorld>("one of the detected trains is the {string} to {string}", function (line: string, destination: string) {
    const exists = this.locationAnalyzer.getStatus().guesses.some((poi) => {
        if (isRouteDistance(poi)) {
            return poi.poi.ref === line && poi.poi.to === destination;
        }
        return false;
    });
    assert.isTrue(exists, `The train ${line} to ${destination} is not detected, but should be. Options were ` + this.locationAnalyzer.getStatus().guesses.map((poi) => {
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
    const route = status.guesses[0] as RouteWithDistance;
    assert.exists(route, "There is no route to check against.");
    return route.poi;
}
