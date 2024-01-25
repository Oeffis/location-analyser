import { setWorldConstructor } from "@cucumber/cucumber";
import { GeoPosition, LocationAnalyzer, Route, Status } from "../src/locationAnalyzer.js";

export class LocationAnalyzerWorld {
    public locationAnalyzer: LocationAnalyzer = new LocationAnalyzer();
    public expectedRoutes: Partial<Route>[] = [];
    public routeOrderMatters = true;
    public statusList: Status[] = [];
    public track: GeoPosition[] = [];
}

setWorldConstructor(LocationAnalyzerWorld);
