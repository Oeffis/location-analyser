import { createReadStream, createWriteStream } from "fs";

const stream = createReadStream("../raw/no-git/nordrhein-westfalen-latest.osm", { encoding: "utf-8" });
const writeStream = createWriteStream("../raw/osm-nodes.xml", { encoding: "utf-8" });
writeStream.write("<nodes>\n");

let prevChunk = "";
stream.on("data", (chunk) => {
    chunk = chunk.toString();

    const workingData = prevChunk + chunk;
    const matches = workingData.matchAll(/<node([^>]*?\/>|.*?<\/node>)/gs);
    const matchArray = Array.from(matches);

    const filteredMatchArray = matchArray.map((match) => match[0]);

    if (filteredMatchArray.length > 0) {
        writeStream.write(filteredMatchArray.join("\n  ") + "\n  ");
    }

    const last = filteredMatchArray[filteredMatchArray.length - 1];
    if (last) {
        const afterLast = workingData.substring(workingData.indexOf(last) + last.length);
        prevChunk = afterLast.includes("<node") ? afterLast : "";
    } else {
        prevChunk = "";
    }
});

stream.on("end", () => {
    writeStream.write("</nodes>");
    writeStream.end();
    console.log("done");
});
