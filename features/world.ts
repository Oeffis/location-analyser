import { setWorldConstructor } from "@cucumber/cucumber";
import { LocationAnalyzer } from "../src/locationAnalyzer";

export class LocationAnalyzerWorld {
    public locationAnalyzer: LocationAnalyzer;
    public location?: [number, number];

    public constructor() {
        this.locationAnalyzer = LocationAnalyzer.forVRR();
    }
}

setWorldConstructor(LocationAnalyzerWorld);
