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
import { LocationAnalyzer, StatusStop, Stop } from "@oeffis/location-analyser";
import { inflate } from "pako";
import { useEffect, useState } from "react";
import "./theme/variables.css";

setupIonicReact();

type StopWithName = Stop & { name: string };

const App: React.FC = () => {
  const position = usePosition();
  const stops = useStops();
  const [nearestStatusStop, setNearestStatusStop] = useState<StatusStop | null>(null);
  const [nearestStop, setNearestStop] = useState<StopWithName | null>(null);
  const analyzer = new LocationAnalyzer(stops);

  const stopMap = stops.reduce<Record<string, StopWithName>>((map, stop) => {
    map[stop.id] = stop;
    return map;
  }, {});

  useEffect(() => {
    if (position.isError) {
      setNearestStop(null);
      return;
    }

    analyzer.updateLocation({
      latitude: position.position.coords.latitude,
      longitude: position.position.coords.longitude,
      altitude: position.position.coords.altitude ?? undefined
    });
    const status = analyzer.getStatus();
    const statusStop = status.stops[0];
    if (!statusStop) {
      setNearestStop(null);
      return;
    }
    setNearestStatusStop(statusStop);

    const stop = stopMap[statusStop.id];
    if (!stop) {
      setNearestStop(null);
      return;
    }

    setNearestStop(stop);
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
        <h1>Nearest Stop</h1>
        {nearestStop && nearestStatusStop && (<p>
          ID: {nearestStop.id}<br />
          Name: {nearestStop.name}<br />
          Distance: {nearestStatusStop.distance}m<br />
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

function useStops(): StopWithName[] {
  const [stops, setStops] = useState<StopWithName[]>([]);

  useEffect(() => {
    (async () => {
      const response = await fetch("stopsWithNames.csv.pako");
      const zippedCSVStopps = await response.arrayBuffer();
      const csvStopps = inflate(zippedCSVStopps, { to: "string" });
      const lines = csvStopps.split("\n");
      const stopLines = lines.slice(1);

      setStops(stopLines.map(lineToStop));
    })().catch(console.error);
  });

  function lineToStop(line: string): StopWithName {
    return {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: line.split(",")[0]!,
      location: {
        latitude: Number(line.split(",")[2]),
        longitude: Number(line.split(",")[3])
      },
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      name: line.split(",")[4]!
    };
  }

  return stops;
}

export default App;
