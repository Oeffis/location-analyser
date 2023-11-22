import { createReadStream, createWriteStream } from "fs";

const stream = createReadStream("../raw/nordrhein-westfalen-latest.osm", { encoding: "utf-8" });
const writeStream = createWriteStream("../raw/osm-ways.xml", { encoding: "utf-8" });
writeStream.write("<ways>\n");

let prevChunk = "";
let lineCounter = 0;
stream.on("data", (chunk) => {
    chunk = chunk.toString();

    lineCounter += chunk.split("\n").length;
    if (lineCounter < 95315040) {
        return;
    }
    if (lineCounter > 279700000) {
        stream.close();
    }

    const workingData = prevChunk + chunk;
    const matches = workingData.matchAll(/<way.*?<\/way>/gs);
    const matchArray = Array.from(matches);

    const filteredMatchArray = matchArray.filter((match) =>
        match[0].includes("platform")
    ).map((match) => match[0]);

    if (filteredMatchArray.length > 0) {
        writeStream.write(filteredMatchArray.join("\n  ") + "\n  ");
    }
    if (workingData.includes("<way")) {
        prevChunk = workingData.substring(workingData.lastIndexOf("<way"));
    } else {
        prevChunk = "";
    }
});

stream.on("end", () => {
    writeStream.write("</ways>");
    writeStream.end();
    console.log("done");
});
