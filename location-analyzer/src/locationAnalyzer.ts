import { TransitPOI } from "./routeMap.js";
import { InitialState } from "./states/initialState.js";
import { GeoPosition, ResultStatus, Status, isResultStatus } from "./states/state.js";

export class LocationAnalyzer {
    protected currentState = new InitialState();

    public constructor(pois: TransitPOI[] = []) {
        this.updatePOIs(pois);
    }

    public updatePOIs(pois: TransitPOI[]): void {
        this.currentState.updatePOIs(pois);

        const status = this.getStatus();
        isResultStatus(status) && this.updatePosition(status.location);
    }

    public getStatus(): Status {
        return this.currentState;
    }

    public updatePosition(location: GeoPosition): ResultStatus {
        return this.getNextStatus(location);
    }

    private getNextStatus(location: GeoPosition): ResultStatus {
        return this.currentState = this.currentState.getNext(location);
    }
}

export * from "./states/state.js";
