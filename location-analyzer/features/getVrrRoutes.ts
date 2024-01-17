/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { readFile } from "fs/promises";
import { inflate } from "pako";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

let routesPromise: Promise<Route[]> | null = null;

export function getVrrRoutes(): Promise<Route[]> {
    if (!routesPromise) {
        routesPromise = loadFullRoutes();
    }
    return routesPromise;
}

async function loadFullRoutes(): Promise<Route[]> {
    const routes = await loadRoutes();
    const sections = await loadSections();
    let sectionIndex = 0;
    for (const route of routes) {
        let consecutiveSection = 0;
        let consecutiveSectionSections: Section[] = [];
        route.sections.push(consecutiveSectionSections);

        while (sectionIndex < sections.length && sections[sectionIndex]?.routeId === route.id) {
            const section = sections[sectionIndex]!;
            if (section.consecutiveSection !== consecutiveSection) {
                consecutiveSection++;
                consecutiveSectionSections = [];
                route.sections.push(consecutiveSectionSections);
            }
            consecutiveSectionSections.push(section);
            sectionIndex++;
        }
    }
    return routes;
}

async function loadSections(): Promise<Section[]> {
    const sectionLines = await readZippedCsv("sections");
    return sectionLines.map(lineToSection);
}

async function loadRoutes(): Promise<Route[]> {
    const routeLines = await readZippedCsv("routes");
    return routeLines.map(lineToRoute);
}

export interface Route {
    id: string;
    from: string;
    to: string;
    ref: string;
    sections: Section[][];
}

export interface Section {
    routeId: string;
    consecutiveSection: number;
    sequence: number;
    lat: number;
    lon: number;
}

async function readZippedCsv(name: string): Promise<string[]> {
    const filename = fileURLToPath(import.meta.url);
    const currentDirname = dirname(filename);
    const path = join(currentDirname, `./data/${name}.csv.zlib`);
    const zippedCSV = await readFile(path);
    const csv = inflate(zippedCSV, { to: "string" });
    const lines = csv.split("\n");
    return lines.slice(1);
}

function lineToRoute(line: string): Route {
    return {
        id: line.split(",")[0]!,
        from: line.split(",")[1]!,
        to: line.split(",")[2]!,
        ref: line.split(",")[3]!,
        sections: []
    };
}

function lineToSection(line: string): Section {
    return {
        routeId: line.split(",")[0]!,
        consecutiveSection: Number(line.split(",")[1]),
        sequence: Number(line.split(",")[2]),
        lat: Number(line.split(",")[3]),
        lon: Number(line.split(",")[4])
    };
}
