import { app, Tray, Menu, shell, nativeImage } from "electron";
import path from "path";
import fs from "fs";
import { spawn, ChildProcess } from "child_process";
import http from "http";

// Config - Load from engine config
let FRONTEND_URL = "http://localhost:3000"; // Default fallback
let SERVER_CONFIG = { url: "http://localhost:3000" }; // Default server config for UI

// Try to load the actual port from engine config
try {
  // Look for user_settings.json in root or engine directory
  const rootSettingsPath = path.join(__dirname, '../../user_settings.json');
  const engineSettingsPath = path.join(__dirname, '../../engine/user_settings.json');

  let settings = null;
  if (fs.existsSync(rootSettingsPath)) {
    settings = JSON.parse(fs.readFileSync(rootSettingsPath, 'utf8'));
  } else if (fs.existsSync(engineSettingsPath)) {
    settings = JSON.parse(fs.readFileSync(engineSettingsPath, 'utf8'));
  }

  if (settings && settings.server && settings.server.port) {
    const port = settings.server.port;
    const host = settings.server.host || 'localhost';
    FRONTEND_URL = `http://${host}:${port}`;
    SERVER_CONFIG = { url: FRONTEND_URL };
  }
} catch (e) {
  console.log('[Electron] Could not load server config, using default:', e instanceof Error ? e.message : String(e));
}
let tray: Tray | null = null;
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

  // DEBUG DEBUG DEBUG
  try {
    if (fs.existsSync(engineScript)) {
      log(`[DEBUG] File exists: ${engineScript}`);
    } else {
      log(`[DEBUG] File NOT found: ${engineScript}`);
      // List directory to see what IS there
      const engineDist = path.join(rootDir, "engine/dist");
      if (fs.existsSync(engineDist)) {
        log(`[DEBUG] Contents of ${engineDist}: ${fs.readdirSync(engineDist).join(', ')}`);
      } else {
        log(`[DEBUG] Directory missing: ${engineDist}`);
      }
    }
  } catch (e) { log(`[DEBUG] Error checking file: ${e}`); }

  // Spawn Node process
  engineProcess = spawn("node", ["--expose-gc", "--max-old-space-size=8192", engineScript], {
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
        log("✓ Engine is ready. Launching Browser...");
        shell.openExternal(FRONTEND_URL);
        updateTray("Running");
      } else {
        log("✗ Engine health check failed. Retrying in 10s...");
        setTimeout(() => {
          checkHealth().then((alive2) => {
            if (alive2) {
              log("✓ Engine is ready (retry). Launching Browser...");
              shell.openExternal(FRONTEND_URL);
              updateTray("Running");
            } else {
              log("✗ Engine failed to start. Check logs above.");
              updateTray("Failed");
            }
          });
        }, 10000); // Increased retry delay to 10 seconds
      }
    });
  }, 12000); // Increased initial wait time to 12 seconds

  engineProcess.on("close", (code) => {
    log(`Engine process exited with code ${code}`);
    engineProcess = null;
    updateTray("Stopped");
  });
}

function createTray() {
  // Use a simple default icon or generate one if missing
  // For now, we'll try to load a standard icon or fallback to empty for dev
  const iconPath = path.join(__dirname, "../assets/icon.png");
  // Note: in dev this might not exist, but let's assume robust resource handling isn't critical for this step yet
  // If no icon, Tray might fail on some OS, so let's try safely.

  try {
    // Create a basic tray
    // If icon is missing, just log and continue without tray (or use empty image if possible on platform)
    // tray = new Tray(...) 

    const iconFile = process.platform === 'win32' ? path.join(__dirname, '../../frontend/public/vite.svg') : iconPath;
    if (fs.existsSync(iconFile)) {
      tray = new Tray(iconFile);
      const contextMenu = Menu.buildFromTemplate([
        { label: 'Sovereign Context Engine', enabled: false },
        { type: 'separator' },
        { label: 'Status: Initializing', id: 'status', enabled: false },
        { type: 'separator' },
        { label: 'Open Web UI', click: () => shell.openExternal(FRONTEND_URL) },
        {
          label: 'Restart Engine', click: () => {
            if (engineProcess) engineProcess.kill();
            startEngine();
          }
        },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() }
      ]);

      tray.setToolTip('Sovereign Context Engine');
      tray.setContextMenu(contextMenu);
    } else {
      log(`[WARN] Tray icon not found at ${iconFile} - Tray disabled.`);
    }

  } catch (e) {
    log('Failed to create Tray icon: ' + e);
  }
}

function updateTray(status: string) {
  if (!tray) return;
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Sovereign Context Engine', enabled: false },
    { type: 'separator' },
    { label: `Status: ${status}`, enabled: false },
    { type: 'separator' },
    { label: 'Open Web UI', click: () => shell.openExternal(FRONTEND_URL) },
    {
      label: 'Restart Engine', click: () => {
        if (engineProcess) engineProcess.kill();
        startEngine();
      }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
}

function initializeService() {
  log("Initializing Headless Service...");
  createTray();

  // Check if engine is already running
  checkHealth()
    .then((alive) => {
      if (alive) {
        log("Engine already running. Launching Browser...");
        log("NOTE: Since the engine was already active, its terminal output will NOT appear in this console.");
        shell.openExternal(FRONTEND_URL);
        updateTray("Running");
      } else {
        log("No engine detected, starting new instance...");
        startEngine();
      }
    })
    .catch((err) => {
      log(`Health check error: ${err}`);
      startEngine();
    });
}

function checkHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    log("Initiating health check request...");
    const timeout = setTimeout(() => {
      log("Health check timeout after 15 seconds");
      resolve(false);
    }, 15000); // Increased timeout to 15 seconds

    const req = http.get(`${FRONTEND_URL}/health`, (res) => {
      log(`Health check response received: ${res.statusCode}`);
      clearTimeout(timeout);
      log(`Health check response: ${res.statusCode}`);
      resolve(res.statusCode === 200 || res.statusCode === 207);
    });
    req.on("error", (err: any) => {
      clearTimeout(timeout);
      log(`Health check error: ${err.message}`);
      // Log specific error codes that might help debug
      if (err.code === 'ECONNREFUSED') {
        log('Server is not accepting connections');
      } else if (err.code === 'ECONNRESET') {
        log('Connection was reset by server');
      } else if (err.code === 'ETIMEDOUT') {
        log('Request timed out');
      }
      resolve(false);
    });
    req.end();
    log("Health check request sent, awaiting response...");
  });
}

// Hide dock icon on macOS
if (process.platform === 'darwin') {
  app.dock.hide();
}

app.on("ready", initializeService);

app.on("will-quit", () => {
  if (engineProcess) {
    log("Killing Engine process...");
    engineProcess.kill();
  }
});

// Prevent app from quitting when all windows are closed (since we have no windows)
app.on("window-all-closed", (e: Event) => {
  e.preventDefault();
});
