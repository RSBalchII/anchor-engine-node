import { app, BrowserWindow, screen, ipcMain } from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import http from "http";

// Config
const FRONTEND_URL = "http://localhost:3000";
let mainWindow: BrowserWindow | null = null;
let engineProcess: ChildProcess | null = null;

function log(msg: string) {
  console.log(`[Electron] ${msg}`);
}

function startEngine() {
  log("Starting Sovereign Context Engine...");

  // Resolve paths relative to built main.js (in dist/)
  // desktop-overlay/dist/main.js -> desktop-overlay/ -> ECE_Core/
  const rootDir = path.resolve(__dirname, "../../");
  const engineScript = path.join(rootDir, "engine/dist/index.js");

  log(`Root directory: ${rootDir}`);
  log(`Engine script: ${engineScript}`);

  // Spawn Node process
  engineProcess = spawn("node", [engineScript], {
    cwd: rootDir,
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  log(`Engine process spawned with PID: ${engineProcess.pid}`);

  engineProcess.on("error", (err) => {
    log(`Failed to start engine: ${err.message}`);
  });

  // Wait for engine to start, then check health
  setTimeout(() => {
    log("Checking engine health...");
    checkHealth().then((alive) => {
      if (alive) {
        log("✓ Engine is ready. Loading UI...");
        if (mainWindow) {
          mainWindow.loadURL(FRONTEND_URL);
        }
      } else {
        log("✗ Engine health check failed. Retrying in 2s...");
        setTimeout(() => {
          checkHealth().then((alive2) => {
            if (alive2 && mainWindow) {
              log("✓ Engine is ready (retry). Loading UI...");
              mainWindow.loadURL(FRONTEND_URL);
            } else {
              log("✗ Engine failed to start. Check logs above.");
            }
          });
        }, 2000);
      }
    });
  }, 3000); // Increased wait time to 3s

  engineProcess.on("close", (code) => {
    log(`Engine process exited with code ${code}`);
    engineProcess = null;
  });
}

function createWindow() {
  log("Creating Electron window...");
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    x: Math.max(0, width - 1450), // Ensure it's on screen
    y: 50,
    frame: true, // Use standard frame for now to see if window appears
    alwaysOnTop: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  log("Window created, checking for running engine...");

  // Show loading message
  mainWindow.loadURL(
    `data:text/html,<html><body style="background:#1a1a1a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h1>Sovereign Context Engine</h1><p>Starting engine...</p></div></body></html>`,
  );

  // IPC Handlers for Title Bar
  ipcMain.on("window-minimize", () => mainWindow?.minimize());
  ipcMain.on("window-maximize", () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on("window-close", () => mainWindow?.close());

  // Check if engine is already running
  checkHealth()
    .then((alive) => {
      if (alive) {
        log("Engine already running. Connecting...");
        mainWindow?.loadURL(FRONTEND_URL);
      } else {
        log("No engine detected, starting new instance...");
        startEngine();
      }
    })
    .catch((err) => {
      log(`Health check error: ${err}`);
      startEngine();
    });

  mainWindow.on("closed", () => {
    log("Window closed");
    mainWindow = null;
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      log(`Failed to load: ${errorCode} - ${errorDescription}`);
    },
  );

  mainWindow.webContents.on("did-finish-load", () => {
    log("Page loaded successfully");
  });

  // Forward console messages from renderer
  mainWindow.webContents.on(
    "console-message",
    (event, level, message, line, sourceId) => {
      const levelStr = ["log", "warn", "error"][level] || "log";
      console.log(`[Renderer ${levelStr}] ${message} (${sourceId}:${line})`);
    },
  );

  // Open DevTools automatically for debugging
  mainWindow.webContents.openDevTools({ mode: "detach" });
}

function checkHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      log("Health check timeout");
      resolve(false);
    }, 3000);

    const req = http.get(`${FRONTEND_URL}/health`, (res) => {
      clearTimeout(timeout);
      log(`Health check response: ${res.statusCode}`);
      resolve(res.statusCode === 200);
    });
    req.on("error", (err) => {
      clearTimeout(timeout);
      log(`Health check error: ${err.message}`);
      resolve(false);
    });
    req.end();
  });
}

app.on("ready", createWindow);

app.on("will-quit", () => {
  if (engineProcess) {
    log("Killing Engine process...");
    engineProcess.kill();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
