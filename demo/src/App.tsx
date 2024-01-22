/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { IonApp, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, setupIonicReact } from "@ionic/react";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/display.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";

/* Theme variables */
import { Geolocation, Position } from "@capacitor/geolocation";
import { LocationAnalyzer, POIWithDistance, Route, Section, Stop, isRoute } from "@oeffis/location-analyzer";
import { parse } from "csv/sync";
import { inflate } from "pako";
import { useEffect, useState } from "react";
import "./theme/variables.css";

setupIonicReact();

const App: React.FC = () => {
  const position = usePosition();
  const pois = usePois();
  const [nearestPOI, setNearestPOI] = useState<POIWithDistance | null>(null);
  const analyzer = new LocationAnalyzer(pois);

  function getName(poi: POIWithDistance): string {
    if (isRoute(poi)) {
      return (poi as Route).from + " - " + (poi as Route).to;
    }
    return poi.name;
  }

  useEffect(() => {
    if (position.isError) {
      setNearestPOI(null);
      return;
    }

    analyzer.updateLocation({
      latitude: position.position.coords.latitude,
      longitude: position.position.coords.longitude,
      altitude: position.position.coords.altitude ?? undefined
    });
    const status = analyzer.getStatus();
    const statusStop = status.pois[0];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!statusStop) {
      setNearestPOI(null);
      return;
    }
    setNearestPOI(statusStop);
  }, [position, analyzer]);

  return (<IonApp>
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Location-Analyzer Demo</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <h1>Position</h1>
        {position.isError && <p color="red">{(position.error as Error).message}</p>}
        {!position.isError && (<p>
          Latitude: {position.position.coords.latitude}°< br />
          Longitude: {position.position.coords.longitude}°<br />
          Accuracy: {position.position.coords.accuracy}m<br />
          Time: {new Date(position.position.timestamp).toTimeString()}<br />
        </p>)}
        <h1>Nearest POI</h1>
        {nearestPOI && (<p>
          ID: {nearestPOI.id}<br />
          Name: {getName(nearestPOI)}<br />
          Distance: {nearestPOI.distance.value}m<br />
        </p>)}
      </IonContent>
    </IonPage>
  </IonApp>
  );
};

type PositionResult = PositionSuccessResult | PositionErrorResult;

interface PositionSuccessResult {
  isError: false;
  position: Position;
}

interface PositionErrorResult {
  isError: true;
  error: unknown;
}

function usePosition(): PositionResult {
  const [position, setPosition] = useState<PositionResult>({
    isError: true,
    error: "Waiting for Initial Position"
  });

  useEffect(() => {
    Geolocation.watchPosition({
      enableHighAccuracy: true,
      timeout: 60000,
      maximumAge: 5000
    }, (position, err) => {
      if (err) {
        setPosition({
          isError: true,
          error: err
        });
        return;
      }
      if (!position) {
        setPosition({
          isError: true,
          error: new Error("No error, but still no position")
        });
        return;
      }
      setPosition({
        isError: false,
        position: position
      });
    }).catch(err => {
      setPosition({
        isError: true,
        error: err
      });
    });
  });

  return position;
}

function usePois(): (Stop | Route)[] {
  const [stops, setStops] = useState<(Stop | Route)[]>([]);

  useEffect(() => {
    (async () => {
      const data = await Promise.all([loadFullRoutes(), getVrrStops()]);
      setStops(data.flat());
    })().catch(console.error);
  });
  return stops;
}

export async function getVrrStops(): Promise<Stop[]> {
  const platforms = await loadPlatforms();
  const platformBounds = await loadPlatformBounds();

  let platformBoundIndex = 0;
  for (const platform of platforms) {
    platform.boundaries = [];
    while (platformBoundIndex < platformBounds.length && platformBounds[platformBoundIndex]?.id === platform.id) {
      platform.boundaries.push({
        latitude: parseFloat(platformBounds[platformBoundIndex]!.latitude as unknown as string),
        longitude: parseFloat(platformBounds[platformBoundIndex]!.longitude as unknown as string)
      });
      platformBoundIndex++;
    }
  }

  return platforms;
}

async function loadPlatforms(): Promise<Stop[]> {
  const zippedCsvPlatforms = await (await fetch("./data/platforms.csv.zlib")).arrayBuffer();
  const csvPlatforms = inflate(zippedCsvPlatforms, { to: "string" });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return parse(csvPlatforms, { columns: true }).toArray() as Promise<Stop[]>;
}

async function loadPlatformBounds(): Promise<{ id: string, latitude: number, longitude: number }[]> {
  const zippedCsvPlatformBounds = await (await fetch("./data/platformBounds.csv.zlib")).arrayBuffer();
  const csvPlatformBounds = inflate(zippedCsvPlatformBounds, { to: "string" });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return parse(csvPlatformBounds, { columns: true }).toArray() as Promise<{ id: string, latitude: number, longitude: number }[]>;
}

async function loadFullRoutes(): Promise<Route[]> {
  const routes = await loadRoutes();
  const sections = await loadSections();
  let sectionIndex = 0;
  for (const route of routes) {
    let consecutiveSection = 0;
    let consecutiveSections: (Section)[] = [];
    route.sections.push(consecutiveSections);

    while (sectionIndex < sections.length && sections[sectionIndex]?.routeId === route.id) {
      const section = sections[sectionIndex]!;
      if (section.consecutiveSection !== consecutiveSection) {
        consecutiveSection++;
        consecutiveSections = [];
        route.sections.push(consecutiveSections);
      }
      consecutiveSections.push(section);
      sectionIndex++;
    }
  }
  return routes;
}

async function loadSections(): Promise<(Section & { consecutiveSection: number })[]> {
  const sectionLines = await readZippedCsv("sections");
  return sectionLines.map(lineToSection);
}

async function loadRoutes(): Promise<Route[]> {
  const routeLines = await readZippedCsv("routes");
  return routeLines.map(lineToRoute);
}

async function readZippedCsv(name: string): Promise<string[]> {
  const zippedCSV = await ((await fetch(`./data/${name}.csv.zlib`)).arrayBuffer());
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

function lineToSection(line: string): Section & { consecutiveSection: number } {
  return {
    routeId: line.split(",")[0]!,
    consecutiveSection: Number(line.split(",")[1]),
    sequence: Number(line.split(",")[2]),
    lat: Number(line.split(",")[3]),
    lon: Number(line.split(",")[4])
  };
}

export default App;
