import { Given, Then, When } from "@cucumber/cucumber";
import { LocationAnalyzerWorld } from "../world";

import { assert } from "chai";
import { Route, getVrrRoutes } from "../getVrrRoutes";

const TRAM_302_LANGENDREER_TO_BUER = "572234368";
const TRAM_302_BUER_TO_LANGENDREER = "3720902989";

Given<LocationAnalyzerWorld>("the 302 travels on a separate track in each direction north of Veltins Arena", async function () {
    const routes: Route[] = [
        ...await getDummyRoutes(),
        await getRouteWithIdOrThrow(TRAM_302_LANGENDREER_TO_BUER),
        await getRouteWithIdOrThrow(TRAM_302_BUER_TO_LANGENDREER)
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

async function getRouteWithIdOrThrow(id: string): Promise<Route> {
    const route = await getRouteWithId(id);
    if (!route) {
        throw new Error(`Route with id ${id} not found`);
    }
    return route;
}

async function getRouteWithId(id: string): Promise<Route | undefined> {
    const routes = await getVrrRoutes();
    return routes.find(route => route.id === id);
}

async function getDummyRoutes(): Promise<Route[]> {
    return (await getVrrRoutes()).slice(0, 10);
}
