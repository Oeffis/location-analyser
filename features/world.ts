import { setWorldConstructor } from "@cucumber/cucumber";

export class LocationAnalyzerWorld {
    public location?: [number, number];
}

setWorldConstructor(LocationAnalyzerWorld);
