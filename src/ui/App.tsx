//import { useState } from "react";
import CommunicationPanel from "./components/CommunicationPanel/CommunicationPanel";
import ControlPanel from "./components/ControlPanel/ControlPanel";
import MonitoringPanel from "./components/MonitoringPanel/MonitoringPanel";
import { BackendUrlProvider } from "./context/BackendUrlProvider";
import { ConnectionStatusProvider } from "./context/ConnectionStatusProvider";
import "./app.scss";

function App() {
  return (
    <>
      <BackendUrlProvider>
        <ConnectionStatusProvider>
          <CommunicationPanel />
          <ControlPanel />
          <MonitoringPanel />
        </ConnectionStatusProvider>
      </BackendUrlProvider>
    </>
  );
}

export default App;
