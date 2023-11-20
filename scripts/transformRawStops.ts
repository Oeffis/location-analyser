import { parse } from "csv-parse";
import * as fs from "fs";
import { deflate } from "pako";
import { join } from "path";

const parser = parse({ delimiter: ",", columns: true });
parser.on("error", console.error);

let newStops = "id,parent,latitude,longitude\n";
let newStopsWithNames = "id,parent,latitude,longitude,name\n";
parser.on("readable", function () {
    let stop: RawStop | null;
    while ((stop = parser.read() as RawStop | null) !== null) {
        newStops += `${stop.stop_id},${stop.parent_station},${stop.stop_lat},${stop.stop_lon}\n`;
        newStopsWithNames += `${stop.stop_id},${stop.parent_station},${stop.stop_lat},${stop.stop_lon},${stop.stop_name}\n`;
    }
});

parser.on("end", function () {
    const compressed = deflate(newStops);
    const compressedWithNames = deflate(newStopsWithNames);
    fs.mkdirSync(join(__dirname, "../location-analyzer/features/data"), { recursive: true });
    fs.writeFileSync(join(__dirname, "../location-analyzer/features/data/stops.csv.pako"), compressed);
    fs.writeFileSync(join(__dirname, "../demo/public/stopsWithNames.csv.pako"), compressedWithNames);
});

parser.write(fs.readFileSync(join(__dirname, "../raw/stops.txt")));
parser.end();

interface RawStop {
    /* eslint-disable @typescript-eslint/naming-convention */
    stop_id: string;
    stop_code: string;
    stop_name: string;
    stop_lat: string;
    stop_lon: string;
    stop_url: string;
    location_type: string;
    parent_station: string;
    wheelchair_boarding: string;
    platform_code: string;
    NVBW_HST_DHID: string;
    /* eslint-enable @typescript-eslint/naming-convention */
}
