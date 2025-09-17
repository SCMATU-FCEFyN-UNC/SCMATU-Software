//import { useState } from "react";
import "./app.scss";

function App() {
  const welcomeMsg = window.electron.getWelcomeMessage();

  return (
    <>
      <div>
        <h1>{welcomeMsg}</h1>
      </div>
    </>
  );
}

export default App;
