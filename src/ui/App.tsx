//import { useState } from "react";
import CommunicationPanel from "./components/CommunicationPanel/CommunicationPanel";
import { BackendUrlProvider } from "./context/BackendUrlProvider";
import "./app.scss";

function App() {
  return (
    <>
      <BackendUrlProvider>
        <CommunicationPanel />
      </BackendUrlProvider>
    </>
  );
}

export default App;
