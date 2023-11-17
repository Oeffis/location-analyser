import { setWorldConstructor } from "@cucumber/cucumber";
import { LocationAnalyzer } from "../src/locationAnalyzer";

export class LocationAnalyzerWorld {
    public locationAnalyzer: LocationAnalyzer = new LocationAnalyzer();
}

setWorldConstructor(LocationAnalyzerWorld);
