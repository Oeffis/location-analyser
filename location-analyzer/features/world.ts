import { setWorldConstructor } from "@cucumber/cucumber";
import { GeoLocation, LocationAnalyzer, Route, Status } from "../src/locationAnalyzer.js";

export class LocationAnalyzerWorld {
    public locationAnalyzer: LocationAnalyzer = new LocationAnalyzer();
    public expectedRoutes: Partial<Route>[] = [];
    public routeOrderMatters = true;
    public statusList: Status[] = [];
    public track: GeoLocation[] = [];
}

setWorldConstructor(LocationAnalyzerWorld);
