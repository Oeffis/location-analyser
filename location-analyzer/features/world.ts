import { setWorldConstructor } from "@cucumber/cucumber";
import { LocationAnalyzer, Route } from "../src/locationAnalyzer.js";

export class LocationAnalyzerWorld {
    public locationAnalyzer: LocationAnalyzer = new LocationAnalyzer();
    public expectedRoutes: Partial<Route>[] = [];
    public routeOrderMatters = true;
}

setWorldConstructor(LocationAnalyzerWorld);
