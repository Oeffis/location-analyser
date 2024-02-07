import { Given, Then, When } from "@cucumber/cucumber";
import { LocationAnalyzerWorld } from "../world";

import { assert } from "chai";
import { isRouteDistance, isStopDistance } from "../../src/index.js";
import { OsmRoute as VrrRoute, getOsmRoutes } from "../getOsmRoutes.js";
import { OsmStop, getOsmStops } from "../getOsmStops.js";

interface RawDataTable { rawTable: string[][] }

Given<LocationAnalyzerWorld>("the 302 travels on a separate track in each direction north of Veltins Arena", async function () {
    const TRAM_302_LANGENDREER_TO_BUER = "572234368";
    const TRAM_302_BUER_TO_LANGENDREER = "3720902989";

    // 302 serves this line twice in this direction, with different start locations. As this currently cannot be detected, we filter out these to the others will be detected.
    const hasNoDuplicateAtThisLocation = (route: VrrRoute | OsmStop): boolean => ![
        TRAM_302_LANGENDREER_TO_BUER,
        TRAM_302_BUER_TO_LANGENDREER
    ].includes(route.id);

    const routes = [
        ...await getOsmStops(),
        ...(await getOsmRoutes()).filter(hasNoDuplicateAtThisLocation)
    ];
    this.updatePOIs(routes);
});

Given<LocationAnalyzerWorld>("the RB43 travels on a single track between Buer Süd and Zoo", function () {
    return this.loadAllVrrData();
});

Given<LocationAnalyzerWorld>("the S9 to Wuppertal leaves the area between Gladback and Essen", async function () {
    return this.loadAllVrrData();
});

Given<LocationAnalyzerWorld>("the Lines 399 and 342 split at the start of the Neidenburger Straße", async function () {
    return this.loadAllVrrData();
});

Given<LocationAnalyzerWorld>("I traveled from the Westfälische Hochschule to the Neidenburger Straße", function () {
    this.updatePosition(
        [51.57478, 7.03116, 4.0, 10],
        [51.57467, 7.03106, 4.0, 10],
        [51.57406, 7.03208, 4.0, 10],
        [51.57278, 7.03335, 4.0, 10]
    );
});

Given<LocationAnalyzerWorld>("the RE2 stops at platform 7 of Gelsenkirchen Hbf", async function () {
    return this.loadAllVrrData();
});

Given<LocationAnalyzerWorld>("the 302 travels along the Musiktheater im Revier, where a Bus Stop is North of the track", async function () {
    return this.loadAllVrrData();
});

When<LocationAnalyzerWorld>("I am on the 302 to Buer Rathaus North of Veltins Arena", function () {
    this.updatePosition([51.55826, 7.06077, 5, 5]);
});

When<LocationAnalyzerWorld>("I am on the RB43 between Buer Süd and Zoo", function () {
    this.updatePosition([51.53936, 7.07059, 5, 5]);
});

When<LocationAnalyzerWorld>("I am traveling in the direction of Zoo", function () {
    this.updatePosition([51.53879, 7.07231, 5, 5]);
});

When<LocationAnalyzerWorld>("I move along the area edge between Gladback and Essen", function () {
    this.updatePosition(
        [51.5857704, 7.000457, 5, 5],
        [51.4500238, 7.0000507, 5, 5]
    );
});

When<LocationAnalyzerWorld>("I am on the S9 to Wuppertal between Essen and Wuppertal", function () {
    this.updatePosition([51.34504, 7.10074, 5, 5]);
});

When<LocationAnalyzerWorld>("I am on the RE2 at platform 7 of Gelsenkirchen Hbf", function () {
    this.updatePosition([51.5048071, 7.1028557, 5, 5]);
});

When<LocationAnalyzerWorld>("I travel further along the route of the 399", function () {
    this.updatePosition([51.57275, 7.0334, 5, 5], [51.57287, 7.03364, 5, 5]);
});

When<LocationAnalyzerWorld>("I travel more than ten seconds further along the route of the 399", function () {
    this.updatePosition(
        [51.573638, 7.037283, 4.866884505530313, 10],
        [51.573656, 7.037390, 4.915587848736882, 10],
        [51.573696, 7.037560, 4.92499846848061, 9.81448507464017],
        [51.573691, 7.037711, 5.062668916908621, 8.534938887968146],
        [51.573752, 7.037899, 4.828387381542608, 6.301587931150867],
        [51.573798, 7.038074, 4.843902676245343, 0.08017889919740723],
        [51.573852, 7.038265, 4.881109981948338, 5.37317048190492],
        [51.573920, 7.038500, 4.912195635265518, 6.448920320842547],
        [51.573993, 7.038732, 4.899349945251498, 7.001517464416313],
        [51.574058, 7.038974, 4.982346926747279, 8.553578006608024],
        [51.574114, 7.039121, 4.917431233131508, 9.101992034513593],
        [51.574153, 7.039264, 4.905058764644977, 9.207107199119985],
        [51.574192, 7.039401, 4.935274033095836, 10.30374249063199],
        [51.574235, 7.039540, 4.945231253944659, 10.65276605266484],
        [51.574285, 7.039675, 4.984764417087805, 10.6320553466778],
        [51.574342, 7.039819, 4.942540894018994, 10.87727088498865],
        [51.574384, 7.039967, 4.969750869962438, 10.85517739199417],
        [51.574452, 7.040080, 4.923017614056573, 11.26689435146896],
        [51.574526, 7.040214, 4.893513102294873, 11.18550085647272],
        [51.574581, 7.040360, 4.927861019613368, 10.925234998269],
        [51.574630, 7.040500, 4.92289906128469, 11.23246702701089]
    );
});

Then<LocationAnalyzerWorld>("the detected train is the {string} to {string}", function (line: string, destination: string) {
    const route = this.getFirstRouteOrThrow();
    assert.strictEqual(route.ref, line);
    assert.strictEqual(route.to, destination);
});

Then<LocationAnalyzerWorld>("one of the detected trains is the {string} to {string}", function (line: string, destination: string) {
    const exists = this.getStatus().guesses.some((poi) => {
        if (isRouteDistance(poi)) {
            return poi.poi.ref === line && poi.poi.to === destination;
        }
        return false;
    });
    assert.isTrue(exists, `The train ${line} to ${destination} is not detected, but should be. Options were ` + this.getStatus().guesses.map((poi) => {
        if (isRouteDistance(poi)) {
            return `${poi.poi.ref} to ${poi.poi.to}`;
        }
        if (isStopDistance(poi)) {
            return poi.poi.name;
        }
    }).join(", "));
});

Then<LocationAnalyzerWorld>("the train {string} to {string} is not detected", function (line: string, destination: string) {
    const route = this.getFirstRoute();
    const sameLine = route?.ref === line;
    const sameDestination = route?.to === destination;
    assert.isFalse(sameLine && sameDestination, `The train ${line} to ${destination} is detected, but should not be.`);
});

Then<LocationAnalyzerWorld>("the following lines are detected", function (table: RawDataTable) {
    const expectedLines = table.rawTable.map(row => ({
        line: row[0],
        destination: row[1]
    }));

    const status = this.getStatus();
    const allFound = expectedLines.every(expectedLine =>
        status.guesses.some((poi) =>
            isRouteDistance(poi)
            && poi.poi.ref === expectedLine.line && poi.poi.to === expectedLine.destination));

    assert.isTrue(allFound, `Not all lines were detected. Options were ` + status.guesses.map((poi) => {
        if (isRouteDistance(poi)) {
            return `${poi.poi.ref} to ${poi.poi.to}`;
        }
    }).join(",\n"));
});
