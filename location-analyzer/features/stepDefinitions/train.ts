import { Given, Then, When } from "@cucumber/cucumber";
import { LocationAnalyzerWorld } from "../world";

import { assert } from "chai";
import { Stop, isRouteDistance } from "../../src/locationAnalyzer.js";
import { Route as VrrRoute, getVrrRoutes } from "../getVrrRoutes.js";
import { getVrrStops } from "../getVrrStops.js";

interface RawDataTable { rawTable: string[][] }

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
        [51.57478, 7.03116],
        [51.57467, 7.03106],
        [51.57406, 7.03208],
        [51.57278, 7.03335]
    );
});

Given<LocationAnalyzerWorld>("the RE2 stops at platform 7 of Gelsenkirchen Hbf", async function () {
    return this.loadAllVrrData();
});

Given<LocationAnalyzerWorld>("the 302 travels along the Musiktheater im Revier, where a Bus Stop is North of the track", async function () {
    return this.loadAllVrrData();
});

When<LocationAnalyzerWorld>("I am on the 302 to Buer Rathaus North of Veltins Arena", function () {
    this.updatePosition([51.55826, 7.06077]);
});

When<LocationAnalyzerWorld>("I am on the RB43 between Buer Süd and Zoo", function () {
    this.updatePosition([51.53936, 7.07059]);
});

When<LocationAnalyzerWorld>("I am traveling in the direction of Zoo", function () {
    this.updatePosition([51.53879, 7.07231]);
});

When<LocationAnalyzerWorld>("I move along the area edge between Gladback and Essen", function () {
    this.updatePosition(
        [51.5857704, 7.000457],
        [51.4500238, 7.0000507]
    );
});

When<LocationAnalyzerWorld>("I am on the S9 to Wuppertal between Essen and Wuppertal", function () {
    this.updatePosition([51.34504, 7.10074]);
});

When<LocationAnalyzerWorld>("I am on the RE2 at platform 7 of Gelsenkirchen Hbf", function () {
    this.updatePosition([51.5048071, 7.1028557]);
});

When<LocationAnalyzerWorld>("I travel further along the route of the 399", function () {
    this.updatePosition([51.57275, 7.0334], [51.57287, 7.03364]);
});

When<LocationAnalyzerWorld>("I travel more than ten seconds further along the route of the 399", function () {
    this.updatePosition(
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
    );
});

Then<LocationAnalyzerWorld>("the detected train is the {string} to {string}", function (line: string, destination: string) {
    const route = this.getFirstRoute();
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
        return poi.poi.name;
    }).join(", "));
});

Then<LocationAnalyzerWorld>("the train {string} to {string} is not detected", function (line: string, destination: string) {
    const route = this.getFirstRoute();

    const sameLine = route.ref === line;
    const sameDestination = route.to === destination;
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
