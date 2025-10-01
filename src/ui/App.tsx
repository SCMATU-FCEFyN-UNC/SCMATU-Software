//import { useState } from "react";
import CommunicationPanel from "./components/CommunicationPanel/CommunicationPanel";
import ControlPanel from "./components/ControlPanel/ControlPanel";
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
        </ConnectionStatusProvider>
      </BackendUrlProvider>
    </>
  );
}

export default App;
