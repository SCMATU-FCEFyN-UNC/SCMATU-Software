//import { useState } from "react";
import Hello from "./components/Hello/Hello";
import { BackendUrlProvider } from "./context/BackendUrlProvider";
import "./app.scss";

function App() {
  const welcomeMsg = window.electron.getWelcomeMessage();

  return (
    <>
      <BackendUrlProvider>
        <div>
          <h1>{welcomeMsg}</h1>
        </div>
        <Hello />
      </BackendUrlProvider>
    </>
  );
}

export default App;
