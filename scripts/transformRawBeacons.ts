/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { getVrrStops } from "@oeffis/location-analyzer/features/getVrrStops";
import { ok as assertOk } from "assert";
import { readFileSync } from "fs";

class BufferedReader {
    public offset = 0;
    constructor(private buffer: Buffer) { }

    public readInt8(): number {
        const value = this.buffer.readInt8(this.offset);
        this.offset += 1;
        return value;
    }

    public readString(): string {
        const originalOffset = this.offset;
        const expectedLength = this.readInt8();
        let string = "";
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, no-constant-condition
        for (let i = 0; i < expectedLength; i++) {
            const charAsInt = this.readInt8();
            const char = String.fromCharCode(charAsInt);
            if (char === "\0") {
                break;
            }
            string += char;
        }

        this.offset = originalOffset + expectedLength + 1;
        return string;
    }

    public readInt32LE(): number {
        const value = this.buffer.readInt32LE(this.offset);
        this.offset += 4;
        return value;
    }

    public readUInt16LE(): number {
        const value = this.buffer.readUInt16LE(this.offset);
        this.offset += 2;
        return value;
    }

    public canRead(): boolean {
        return this.offset < this.buffer.length;
    }
}

async function main(): Promise<void> {
    const beacons = getBeacons();
    const vrrStops = await getVrrStops();

    const beaconMap = new Map<string, Beacon>();
    beacons.forEach(beacon => beaconMap.set(beacon.globalId, beacon));

    const stopsWithBeacons = vrrStops.filter(stop => {
        const result = beacons.find(beacon => beacon.globalId && stop.id.startsWith(beacon.globalId));
        if (result) {
            console.log(`${stop.id} has a beacon with id ${result.globalId}`);
        }
        return result !== undefined;
    });

    console.log(`stops with beacons: ${stopsWithBeacons.length} (${stopsWithBeacons.length / vrrStops.length * 100}%)`);

    const beaconsWithoutStop = beacons.filter(beacon => {
        const result = vrrStops.find(stop => stop.id.startsWith(beacon.globalId));
        return result === undefined;
    });

    console.log(`beacons without stop: ${beaconsWithoutStop.length} (${beaconsWithoutStop.length / beacons.length * 100}%)`);
}

function getBeacons(): Beacon[] {
    const buffer = readFileSync("raw/STOP_AREA_Beacon.bin");
    const bufferedReader = new BufferedReader(buffer);
    const beaconCount = bufferedReader.readInt32LE();
    const beacons: Beacon[] = [];

    while (bufferedReader.canRead()) {
        const string = bufferedReader.readString();
        const splitted = string.split("/");
        const type = splitted[0]!;
        const splitted2 = splitted[1]!.split(":");
        const uuid = splitted2[0]!.toUpperCase();
        const major = parseInt(splitted2[1]!, 16);
        const minor = parseInt(splitted2[2]!, 16);

        const globalId = bufferedReader.readString();
        bufferedReader.offset += 12;

        beacons.push({
            type,
            uuid,
            major,
            minor,
            globalId
        });
    }

    assertOk(beacons.length === beaconCount, "beacon count mismatch");
    return beacons;
}

interface Beacon {
    type: string;
    uuid: string;
    major: number;
    minor: number;
    globalId: string;
}

main().catch(console.error);
