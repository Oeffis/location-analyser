import { IonApp, IonContent, IonHeader, setupIonicReact } from "@ionic/react";

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
import { useEffect, useState } from "react";
import "./theme/variables.css";

setupIonicReact();

const App: React.FC = () => {
  const position = usePosition();

  return (<IonApp>
    <IonHeader>
      <h1>Geolocation</h1>
    </IonHeader>
    <IonContent>
      {position.isError && <p color="red">{position.error as string}</p>}
      {!position.isError && (<p>
        Latitude: {position.position.coords.latitude} < br />
        Longitude: {position.position.coords.longitude}<br />
        Accuracy: {position.position.coords.accuracy}<br />
        Time: {position.position.timestamp}<br />
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

export default App;
