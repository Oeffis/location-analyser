import { readFile } from "fs/promises";
import { inflate } from "pako";
import { join } from "path";

let routesPromise: Promise<Route[]> | null = null;

export function getVrrRoutes(): Promise<Route[]> {
    if (!routesPromise) {
        routesPromise = loadRoutes();
    }
    return routesPromise;
}

async function loadRoutes(): Promise<Route[]> {
    const routeLines = await readZippedCsv("routes");
    const sectionLines = await readZippedCsv("sections");
    const routes = routeLines.map(lineToRoute);
    const sections = sectionLines.map(lineToSection);
    routes.forEach(route =>
        route.sections = sections
            .filter(section => section.routeId === route.id)
            .sort((a, b) => a.sequence - b.sequence)
    );
    return routes;
}

export interface Route {
    id: string;
    from: string;
    to: string;
    ref: string;
    sections: Section[];
}

export interface Section {
    routeId: string;
    sequence: number;
    lat: number;
    lon: number;
}

async function readZippedCsv(name: string): Promise<string[]> {
    const path = join(__dirname, `./data/${name}.csv.zlib`);
    const zippedCSV = await readFile(path);
    const csv = inflate(zippedCSV, { to: "string" });
    const lines = csv.split("\n");
    return lines.slice(1);
}

function lineToRoute(line: string): Route {
    return {
        id: line.split(",")[0],
        from: line.split(",")[1],
        to: line.split(",")[2],
        ref: line.split(",")[3],
        sections: []
    };
}

function lineToSection(line: string): Section {
    return {
        routeId: line.split(",")[0],
        sequence: Number(line.split(",")[1]),
        lat: Number(line.split(",")[2]),
        lon: Number(line.split(",")[3])
    };
}
