import { app, BrowserWindow, ipcMain } from "electron";
import { spawn } from "child_process";
import path from "path";
import net from "net";
import { dirname } from "path";
import { fileURLToPath } from "url";

import { getPreloadPath } from "./pathResolver.js";
import { isDev } from "./util.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let backendProcess: ReturnType<typeof spawn> | null = null;
let backendPort: number;

/**
 * Finds an available TCP port starting from `startingPort`.
 * This ensures we don't fail if the default port is busy.
 */
async function getAvailablePort(startingPort = 5000): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(startingPort, () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
  });
}

/**
 * Creates the main application window.
 * Uses getPreloadPath() for consistent preload resolution
 * across development and production builds.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      preload: getPreloadPath(),
    },
  });

  if (isDev()) {
    mainWindow.loadURL("http://localhost:5123"); // Vite dev server
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), "dist-react/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Starts the Python backend server as a subprocess.
 * Passes the dynamically allocated port as an argument.
 */
function startBackend(port: number) {
    const pythonExecutable = process.platform === "win32" ? "python" : "python3";

    // In dev, we run from the source folder. In prod, backend is packaged in resources.
    const cwdPath = isDev()
        ? path.join(__dirname, '..', 'src',  "electron") // so "backend" is visible as a package
        : path.join(process.resourcesPath);      // packaged app path

    console.log(`Starting backend module backend.app on port ${port}`);
    backendProcess = spawn(
        pythonExecutable,
        ["-m", "backend.app", port.toString()],
        { cwd: cwdPath }
    );

    backendProcess?.stdout?.on("data", (data: Buffer) => {
        console.log(`[Backend]: ${data.toString()}`);
    });

    backendProcess?.stderr?.on("data", (data: Buffer) => {
        console.error(`[Backend ERROR]: ${data.toString()}`);
    });

    backendProcess.on("exit", (code) => {
        console.log(`Backend process exited with code ${code}`);
    });
}

/**
 * Stops the Python backend process (if running).
 */
function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    console.log("Backend process terminated");
  }
}

// Electron lifecycle
app.whenReady().then(async () => {
  console.log("App is ready");

  backendPort = await getAvailablePort(5000);
  console.log(`Using backend port: ${backendPort}`);

  // IPC handler so preload/renderer can get the port
  ipcMain.handle("get-backend-port", async () => backendPort);

  startBackend(backendPort);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  stopBackend();
});
