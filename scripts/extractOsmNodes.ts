/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { XMLParser } from "fast-xml-parser";
import { createReadStream, createWriteStream, readFileSync } from "fs";

const waysFile = readFileSync("../raw/osm-ways.xml", { encoding: "utf-8" });
const xml = new XMLParser({ ignoreAttributes: false }).parse(waysFile);
const nodeIds = xml.ways.way
    .map((way: any) => way.nd.map((nd: any) => nd["@_ref"]))
    .flat()
    .map((id: string) => parseInt(id, 10));

console.log("done parsing ways");

const stream = createReadStream("../raw/no-git/nordrhein-westfalen-latest.osm", { encoding: "utf-8" });
const writeStream = createWriteStream("../raw/osm-nodes.xml", { encoding: "utf-8" });
writeStream.write("<nodes>\n");

let prevChunk = "";
stream.on("data", (chunk) => {
    chunk = chunk.toString();

    const workingData = prevChunk + chunk;
    const matches = workingData.matchAll(/<node id="(?<id>\d+)"([^>]*?\/>|.*?<\/node>)/gs);
    const matchArray = Array.from(matches);

    const filteredMatchArray = matchArray
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .filter((match) => nodeIds.includes(parseInt(match.groups!.id, 10)))
        .map((match) => match[0]);

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
