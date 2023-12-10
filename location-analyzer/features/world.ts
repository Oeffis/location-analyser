import { setWorldConstructor } from "@cucumber/cucumber";
import { LocationAnalyzer, Route } from "../src/locationAnalyzer";

export class LocationAnalyzerWorld {
    public locationAnalyzer: LocationAnalyzer = new LocationAnalyzer();
    public expectedRoutes: Partial<Route>[] = [];
}

setWorldConstructor(LocationAnalyzerWorld);
