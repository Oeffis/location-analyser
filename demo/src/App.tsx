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
import { Route, Section, State, Stop, isRouteDistance } from "@oeffis/location-analyzer";
import { POIWithDistance } from "@oeffis/location-analyzer/dist/distanceCalculator";
import { parse } from "csv-parse/browser/esm/sync";
import { getSpeed } from "geolib";
import { inflate } from "pako";
import { useEffect, useState } from "react";
import "./theme/variables.css";

setupIonicReact();

const App: React.FC = () => {
  const positions = usePosition();
  const pois = usePois();
  const [state, setState] = useState<State>(State.initial());

  useEffect(() => {
    state.updatePOIs(pois);
  }, [pois]);

  function getName(poi: POIWithDistance): string {
    if (isRouteDistance(poi)) {
      return poi.poi.from + " - " + poi.poi.to;
    }
    return poi.poi.name;
  }

  useEffect(() => {
    if (positions.isError) {
      return;
    }

    const currentPosition = positions.currentPosition;
    const previousPosition = positions.lastPosition;
    const currentCoords = {
      ...currentPosition.coords,
      altitude: undefined,
      time: currentPosition.timestamp
    };
    const previousCoords = previousPosition ? {
      ...previousPosition.coords,
      altitude: undefined,
      time: previousPosition.timestamp
    } : undefined;
    const calculatedSpeed = previousCoords ? getSpeed(previousCoords, currentCoords) : 0;

    setState(state.getNext({
      latitude: currentPosition.coords.latitude,
      longitude: currentPosition.coords.longitude,
      accuracy: currentPosition.coords.accuracy,
      speed: currentPosition.coords.speed ?? calculatedSpeed
    }));
  }, [positions, state]);

  return (<IonApp>
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Location-Analyzer Demo</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <h1>Position</h1>
        {positions.isError && <p color="red">{(positions.error as Error).message}</p>}
        {!positions.isError && (<p>
          Latitude: {positions.currentPosition.coords.latitude}°< br />
          Longitude: {positions.currentPosition.coords.longitude}°<br />
          Accuracy: {positions.currentPosition.coords.accuracy}m<br />
          Time: {new Date(positions.currentPosition.timestamp).toTimeString()}<br />
        </p>)}
        <h1>Guesses</h1>
        {state.guesses.map(guess => (<p key={guess.poi.id}>
          {isRouteDistance(guess) ? "Route" : "Stop"}
          ID: {guess.poi.id}<br />
          Name: {getName(guess)}<br />
          Distance: {guess.distance.value}m<br />
        </p>))}
        {state.guesses.length === 0 && <p>No Guesses</p>}
        <h1>Nearby Platforms</h1>
        {state.nearbyPlatforms.map(platform => (<p key={platform.poi.id}>
          ID: {platform.poi.id}<br />
          Name: {platform.poi.name}<br />
          Distance: {platform.distance.value}m<br />
        </p>))}
        {state.nearbyPlatforms.length === 0 && <p>No Nearby Platforms</p>}
      </IonContent>
    </IonPage>
  </IonApp>
  );
};

type PositionResult = PositionSuccessResult | PositionErrorResult;

interface PositionSuccessResult {
  isError: false;
  currentPosition: Position;
  lastPosition?: Position;
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
    }, (newPosition, err) => {
      if (err) {
        setPosition({
          isError: true,
          error: err
        });
        return;
      }
      if (!newPosition) {
        setPosition({
          isError: true,
          error: new Error("No error, but still no position")
        });
        return;
      }
      setPosition({
        isError: false,
        currentPosition: newPosition,
        lastPosition: position.isError ? undefined : position.currentPosition
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
  const response = await fetch("./platforms.csv.zlib");
  if (!response.ok) throw new Error(`Could not load platforms.csv.zlib`);
  const zippedCsvPlatforms = await response.arrayBuffer();
  const csvPlatforms = inflate(zippedCsvPlatforms, { to: "string" });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return parse(csvPlatforms, { columns: true });
}

async function loadPlatformBounds(): Promise<{ id: string, latitude: number, longitude: number }[]> {
  const response = await fetch("./platformBounds.csv.zlib");
  if (!response.ok) throw new Error(`Could not load platformBounds.csv.zlib`);
  const zippedCsvPlatformBounds = await response.arrayBuffer();
  const csvPlatformBounds = inflate(zippedCsvPlatformBounds, { to: "string" });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return parse(csvPlatformBounds, { columns: true });
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
  const response = await fetch(`./${name}.csv.zlib`);
  if (!response.ok) throw new Error(`Could not load ${name}.csv.zlib`);
  const zippedCSV = await response.arrayBuffer();
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
