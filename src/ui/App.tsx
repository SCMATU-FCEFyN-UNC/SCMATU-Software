import { MainLayout } from "./components/MainLayout/MainLayout";
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
            <MainLayout />
          </ResonanceStatusProvider>
        </ConnectionStatusProvider>
      </BackendUrlProvider>
    </>
  );
}

export default App;
