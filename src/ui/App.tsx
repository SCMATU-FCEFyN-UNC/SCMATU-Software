//import { useState } from "react";
import Hello from "./components/Hello/Hello";
import CommunicationPanel from "./components/CommunicationPanel/CommunicationPanel";
import { BackendUrlProvider } from "./context/BackendUrlProvider";
import "./app.scss";
import Button from "./components/Button/Button";

function App() {
  const welcomeMsg = window.electron.getWelcomeMessage();

  return (
    <>
      <BackendUrlProvider>
        <div>
          <h1>{welcomeMsg}</h1>
        </div>
        <Hello />
        <Button>Click me</Button>
        <CommunicationPanel />
      </BackendUrlProvider>
    </>
  );
}

export default App;
