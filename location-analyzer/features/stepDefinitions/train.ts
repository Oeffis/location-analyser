import { Then, When } from "@cucumber/cucumber";
import { LocationAnalyzerWorld } from "../world";

When<LocationAnalyzerWorld>("I am on a train", function () {
    // noop
});

Then<LocationAnalyzerWorld>("the train I am on is detected", function () {
    // noop
});
