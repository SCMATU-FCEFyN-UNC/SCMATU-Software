//import { useState } from "react";
import CommunicationPanel from "./components/CommunicationPanel/CommunicationPanel";
import ControlPanel from "./components/ControlPanel/ControlPanel";
import MonitoringPanel from "./components/MonitoringPanel/MonitoringPanel";
import DeviceDataPanel from "./components/DeviceDataPanel/DeviceDataPanel";
import { BackendUrlProvider } from "./context/BackendUrlProvider";
import { ConnectionStatusProvider } from "./context/ConnectionStatusProvider";
import { ResonanceStatusProvider } from "./context/ResonanceStatusProvider";
import "./app.scss";

function App() {
  return (
    <>
      <BackendUrlProvider>
        <ConnectionStatusProvider>
          <ResonanceStatusProvider>
            <CommunicationPanel />
            <ControlPanel />
            <MonitoringPanel />
            <DeviceDataPanel />
          </ResonanceStatusProvider>
        </ConnectionStatusProvider>
      </BackendUrlProvider>
    </>
  );
}

export default App;
