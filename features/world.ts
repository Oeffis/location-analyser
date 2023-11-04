import { setWorldConstructor } from "@cucumber/cucumber";

export class LocationAnalyzerWorld {
    public location?: [number, number];
    public status?: {
        stops: {
            id: string;
            distance: number;
        }[]
    };
}

setWorldConstructor(LocationAnalyzerWorld);
