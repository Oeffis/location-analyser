import { OsmExtractor } from "./osmExtractor";
import { OsmTransformer } from "./osmTransformer";

console.log("Extracting OSM data");
new OsmExtractor()
    .extract()
    .then(result => {
        const transformer = new OsmTransformer(result);
        return transformer.writeToFile();
    })
    .then(() => console.log("Done"))
    .catch(console.error);
