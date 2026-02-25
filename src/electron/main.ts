import { app, BrowserWindow, ipcMain } from "electron";
import { spawn, execSync } from "child_process";
import path from "path";
import net from "net";
import { dirname } from "path";
import { fileURLToPath } from "url";

import { getPreloadPath } from "./pathResolver.js";
import { isDev } from "./util.js";
import http from "http";

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
 * Waits for the backend server to be ready by polling a health check endpoint.
 * This ensures all endpoints are initialized before the UI is shown.
 * Waits an extra 800ms after the first successful response to ensure Flask routes are fully registered.
 */
async function waitForBackend(port: number, maxRetries = 30): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.request(
          { method: "GET", host: "127.0.0.1", port, path: "/", timeout: 500 },
          (res) => {
            res.on("data", () => {});
            res.on("end", () => {
              resolve(); // Backend responded
            });
          }
        );
        req.on("error", reject);
        req.on("timeout", () => {
          req.destroy();
          reject();
        });
        req.end();
      });
      // Wait 1600ms more to ensure Flask has fully initialized all routes
      await new Promise((r) => setTimeout(r, 1600));
      console.log("Backend is ready!");
      return true;
    } catch (e) {
      // Wait 100ms before retrying
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  console.warn("Backend did not respond within timeout");
  return false;
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
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      preload: getPreloadPath(),
    },
  });

  mainWindow.maximize(); // This makes it fill the screen
  mainWindow.show();     // Now reveal it to the user

  if (isDev()) {
    mainWindow.loadURL("http://localhost:5123"); // Vite dev server
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), "dist-react/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
    // Stop backend when window closes (important for all platforms)
    stopBackend();
  });
}

/**
 * Starts the Python backend server as a subprocess.
 * Does NOT detach so the console window stays hidden on Windows.
 * Passes the dynamically allocated port as an argument.
 */
function startBackend(port: number) {
  const isWindows = process.platform === "win32";
  const pythonExecutable = isWindows ? "python" : "python3";
  const cwdPath = isDev()
    ? path.join(__dirname, "..", "src", "electron")
    : path.join(process.resourcesPath);

  if (isDev()) {
    // Dev: run python module
    backendProcess = spawn(pythonExecutable, ["-m", "backend.app", port.toString()], {
      cwd: cwdPath,
      //windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } else {
    // Prod: run the bundled exe from extraResources
    const exeName = isWindows ? "app.exe" : "app";
    const exePath = path.join(process.resourcesPath, "backend", exeName);
    backendProcess = spawn(exePath, [port.toString()], {
      cwd: path.dirname(exePath),
      //windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
  }

  // Pipe stdio to main process logs
  backendProcess?.stdout?.on("data", (data: Buffer) => console.log(`[Backend]: ${data.toString()}`));
  backendProcess?.stderr?.on("data", (data: Buffer) => console.error(`[Backend ERROR]: ${data.toString()}`));
  backendProcess?.on("exit", (code) => console.log(`Backend process exited with code ${code}`));
}

/**
 * Stops the Python backend process (if running).
 * First attempts graceful shutdown via the /api/shutdown endpoint.
 * Falls back to force termination if graceful shutdown fails.
 * On Windows, uses taskkill for reliable process termination.
 * On Unix-like systems, uses SIGTERM followed by SIGKILL if needed.
 */
async function stopBackend() {
  if (!backendProcess || !backendProcess.pid) return;

  const isWindows = process.platform === "win32";
  const pid = backendProcess.pid;

  try {
    // Attempt graceful shutdown via endpoint
    console.log(`Attempting graceful shutdown of backend (PID ${pid})...`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      await fetch(`http://127.0.0.1:${backendPort}/shutdown`, {
        method: "POST",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log("Graceful shutdown endpoint called");

      // Wait for process to exit cleanly
      await new Promise((r) => setTimeout(r, 1000));

      if (backendProcess && backendProcess.exitCode !== null) {
        console.log("Backend exited cleanly");
        backendProcess = null;
        return;
      }
    } catch (e) {
      console.log("Graceful shutdown via endpoint failed or timed out, falling back to force termination");
    }

    // Force termination fallback
    console.log(`Force terminating backend process ${pid}...`);
    if (isWindows) {
      try {
        execSync(`taskkill /PID ${pid} /T /F`, { timeout: 2000 });
        console.log(`Backend process ${pid} terminated via taskkill`);
      } catch (e) {
        console.warn(`taskkill failed for PID ${pid}:`, (e as Error).message);
      }
    } else {
      // Unix-like: try SIGTERM first, then SIGKILL
      if (backendProcess && backendProcess.exitCode === null) {
        process.kill(pid, "SIGTERM");
        // Wait a moment for graceful shutdown
        await new Promise((r) => setTimeout(r, 500));
      }
      // Force kill if still running
      if (backendProcess && backendProcess.exitCode === null) {
        process.kill(pid, "SIGKILL");
        console.log(`Backend process ${pid} killed with SIGKILL`);
      }
    }
  } catch (e) {
    console.error(`Error terminating backend process ${pid}:`, e);
  } finally {
    backendProcess = null;
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

  // Wait for backend to be ready before showing the window
  // This ensures all endpoints are initialized
  const backendReady = await waitForBackend(backendPort);
  if (!backendReady) {
    console.warn("Backend did not respond in time, proceeding anyway");
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", async () => {
  await stopBackend();
});
