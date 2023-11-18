import { IonApp, IonContent, IonHeader, IonTitle, setupIonicReact } from "@ionic/react";

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
import { LocationAnalyzer, StatusStop } from "@oeffis/location-analyser";
import { useEffect, useState } from "react";
import "./theme/variables.css";

setupIonicReact();

const App: React.FC = () => {
  const position = usePosition();
  const analyzer = useLocationAnalyzer();
  const [nearestStation, setNearestStation] = useState<StatusStop | null>(null);

  useEffect(() => {
    if (position.isError || !analyzer) {
      return;
    }

    analyzer.updateLocation({
      latitude: position.position.coords.latitude,
      longitude: position.position.coords.longitude,
      altitude: position.position.coords.altitude ?? undefined
    });
    const status = analyzer.getStatus();
    setNearestStation(status.stops[0] ?? null);
  }, [position, analyzer]);

  return (<IonApp>
    <IonHeader>
      <IonTitle>Location-Analyzer Demo</IonTitle>
    </IonHeader>
    <IonContent>
      <h1>Position</h1>
      {position.isError && <p color="red">{position.error as string}</p>}
      {!position.isError && (<p>
        Latitude: {position.position.coords.latitude} < br />
        Longitude: {position.position.coords.longitude}<br />
        Accuracy: {position.position.coords.accuracy}<br />
        Time: {position.position.timestamp}<br />
      </p>)}
      <h1>Analysis Results</h1>
      {nearestStation && (<p>
        Nearest Station ID: {nearestStation.id}<br />
        Nearest Station Distance: {nearestStation.distance}<br />
      </p>)}
    </IonContent>
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
      timeout: 5000,
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
          error: "No error, but still no position"
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

function useLocationAnalyzer(): LocationAnalyzer | null {
  const [analyzer, setAnalyzer] = useState<LocationAnalyzer | null>(null);

  useEffect(() => {
    LocationAnalyzer.forVrr().then(setAnalyzer).catch(console.error);
  });

  return analyzer;
}

export default App;
