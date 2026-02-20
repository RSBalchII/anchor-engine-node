// engine/src/index.ts
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, rmSync } from "fs";

// Fix module load error by using explicit relative path
import { db } from "./core/db.js";
import { config } from "./config/index.js";
import { MODELS_DIR, PROJECT_ROOT } from "./config/paths.js";
import { apiKeyAuth } from "./middleware/auth.js";
import { pathManager } from "./utils/path-manager.js";
import { StructuredLogger } from "./utils/structured-logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: express.Application = express();
const PORT = config.PORT;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    StructuredLogger.info('HTTP_REQUEST', {
      method: req.method,
      path: req.path,
      status,
      duration_ms: duration
    });
    
    // Mark activity for idle manager (skip static files)
    if (!req.path.startsWith('/static') && !req.path.startsWith('/chat')) {
      idleManager.markActive(`${req.method} ${req.path}`);
    }
  });
  next();
});

// Error handler with proper type handling

// Global state tracker
let databaseReady = false;

// Global 503 Guard for API routes
app.use('/v1', (req, res, next) => {
  if (!databaseReady) {
    return res.status(503).json({
      error: "Service temporarily unavailable",
      message: "Database initializing, please wait..."
    });
  }
  next();
});

// API Key Authentication for /v1 routes
app.use('/v1', apiKeyAuth);
if (config.API_KEY && config.API_KEY !== 'ece-secret-key') {
  StructuredLogger.info('AUTH_CONFIG', { api_key_enabled: true });
} else {
  StructuredLogger.info('AUTH_CONFIG', { api_key_enabled: false });
}

// Set up static file serving immediately so UI is accessible
StructuredLogger.info('UI_SETUP', { static_path: '/static' });
app.use("/static", express.static(path.join(__dirname, "../dist"), {
  setHeaders: (res, path) => {
    // Only log debug-level for static files to avoid spam
    StructuredLogger.silly('STATIC_FILE', { path });
  }
}));

// Try to serve the external UI first (when running in full system)
const externalFrontendDist = path.join(__dirname, "../../../packages/anchor-ui/dist");
const internalFrontendDist = path.join(__dirname, "../public");

// Check if external UI exists, otherwise use internal lightweight UI
if (existsSync(externalFrontendDist)) {
  StructuredLogger.info('UI_SOURCE', { source: 'external', path: externalFrontendDist });
  app.use(express.static(externalFrontendDist, {
    setHeaders: (res, path) => {
      StructuredLogger.silly('UI_FILE_SERVED', { path, source: 'external' });
    }
  }));
} else {
  StructuredLogger.info('UI_SOURCE', { source: 'internal', path: internalFrontendDist });
  app.use(express.static(internalFrontendDist, {
    setHeaders: (res, path) => {
      StructuredLogger.silly('UI_FILE_SERVED', { path, source: 'internal' });
    }
  }));
}

// Add explicit /chat route logging
app.get('/chat', (req, res, next) => {
  StructuredLogger.info('CHAT_PAGE_REQUEST', { ip: req.ip });
  next();
});

// Set up a health route that works in both initialized and uninitialized states
app.get('/health', async (_req, res) => {
  if (!databaseReady) {
    return res.status(200).json({
      status: "starting",
      timestamp: new Date().toISOString(),
      message: "Engine is starting up, database not yet initialized"
    });
  }

  // When DB is ready, perform full health check
  try {
    // Test database connectivity
    const result = await db.run('SELECT 1 as test');
    if (result && result.rows && result.rows.length > 0) {
      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        message: "Anchor Context Engine is running and database is responsive"
      });
    } else {
      res.status(503).json({
        status: "degraded",
        timestamp: new Date().toISOString(),
        message: "Engine is running but database query returned unexpected results"
      });
    }
  } catch (dbError) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      message: "Database is not responding properly",
      error: (dbError as Error).message
    });
  }
});

// Set up API routes that can handle uninitialized state
// Use more specific patterns to avoid conflicts with health route

// Model Listing Endpoint (for UI)
app.get('/v1/models', (req, res) => {
  try {
    // Use the robust path from configuration (imported statically)
    let modelPath = config.LLM_MODEL_DIR || MODELS_DIR;

    // If config has a relative path, resolve it against project root
    if (config.LLM_MODEL_DIR && !path.isAbsolute(config.LLM_MODEL_DIR)) {
      // If it starts with ./models, it might be relative to project root
      // MODELS_DIR is already absolute path to project_root/models
      if (config.LLM_MODEL_DIR === './models' || config.LLM_MODEL_DIR === 'models') {
        modelPath = MODELS_DIR;
      } else {
        modelPath = path.resolve(PROJECT_ROOT, config.LLM_MODEL_DIR);
      }
    }

    if (!existsSync(modelPath)) {
      return res.json({ object: 'list', data: [] });
    }

    // Read directory
    import('fs').then(fsModule => {
      const files = fsModule.readdirSync(modelPath).filter(file => file.endsWith('.gguf'));
      const models = files.map(file => ({
        id: file,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'anchor-os'
      }));
      res.json({ object: 'list', data: models });
    });
  } catch (error) {
    console.error('[Engine] Error listing models:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});



// Set up the catch-all route for UI (should be LAST)
// Catch-all moved to end of startServer to avoid intercepting dynamic routes


async function startServer() {
  try {
    console.time("⏱️ Startup Time");
    console.log("Initializing Anchor Context Engine...");

    // Start the server immediately so health checks pass
    app.listen(PORT, config.HOST, () => {
      console.log(`Anchor Context Engine running on ${config.HOST}:${PORT}`);
      console.log(`Health check available at http://${config.HOST}:${PORT}/health`);
    });

    // Initialize database in the background after server starts
    console.log("Initializing database in the background...");
    await db.init();
    databaseReady = true;
    console.log("Database initialized successfully");

    // Initialize Vector Service
    const { vector } = await import("./core/vector.js");
    await vector.init();


    console.log("Setting up full routes after database initialization...");

    // Now that DB is ready, import and set up full routes
    const { setupRoutes } = await import("./routes/api.js");
    const { setupHealthRoutes } = await import("./routes/health.js");
    const { monitoringRouter } = await import("./routes/monitoring.js");

    // Clear the basic API route handlers and set up full routes
    // We'll set up the full routes which will override the basic ones

    // Set up full API routes (this will override the basic ones)
    setupRoutes(app);

    // Set up full health routes (this will replace the basic one)
    setupHealthRoutes(app);

    // Set up monitoring routes
    app.use('/monitoring', monitoringRouter);

    // Reset static and wildcard routes after DB is ready
    app.use("/static", express.static(path.join(__dirname, "../dist")));

    // Determine which UI to serve based on availability
    const externalFrontendDist = path.join(__dirname, "../../../packages/anchor-ui/dist");
    const internalFrontendDist = path.join(__dirname, "../public");

    if (existsSync(externalFrontendDist)) {
      console.log("Using external UI from packages/anchor-ui/dist for catch-all route");
      app.use(express.static(externalFrontendDist));
      // Set up the catch-all route for UI again (should be LAST)
      app.get("*", (req, res) => {
        if (req.path.startsWith("/v1") || req.path.startsWith("/health")) {
          res.status(404).json({ error: "Not Found" });
          return;
        }
        res.sendFile(path.join(externalFrontendDist, "index.html"));
      });
    } else {
      console.log("Using internal lightweight UI from engine/public for catch-all route");
      app.use(express.static(internalFrontendDist));
      // Set up the catch-all route for UI again (should be LAST)
      app.get("*", (req, res) => {
        if (req.path.startsWith("/v1") || req.path.startsWith("/health")) {
          res.status(404).json({ error: "Not Found" });
          return;
        }
        res.sendFile(path.join(internalFrontendDist, "index.html"));
      });
    }


    console.log("Full routes set up, server is ready for all requests");
    console.timeEnd("⏱️ Startup Time");

    // Start other services after database is ready
    console.log('[Services] Starting child services via ProcessManager...');
    
    // Note: Nanobot is now started by the unified launcher (start.bat/start.sh)
    // to prevent duplicate instances. ProcessManager is disabled for nanobot.
    console.log('[Services] Nanobot skipped (started by launcher)');

    const { startWatchdog } = await import("./services/ingest/watchdog.js");
    startWatchdog();

    // Dreamer service disabled - optimized for STAR algorithm startup (v4.0)
    console.log('[Services] All service start commands queued');

    // ============================================
    // Standard 110: Regenerate Derived Data
    // ============================================
    // On startup: regenerate all derived data from inbox/ (source of truth)
    
    // 1. Create mirror from inbox/ files
    console.log('[Startup] Regenerating mirrored_brain/ from inbox/ (Standard 110)...');
    const { createMirror } = await import('./services/mirror/mirror.js');
    await createMirror();
    
    // 2. Generate synonym rings automatically (Standard 111)
    console.log('[Startup] Auto-generating synonym rings from data (Standard 111)...');
    try {
      const { AutoSynonymGenerator } = await import('./services/synonyms/auto-synonym-generator.js');
      const generator = new AutoSynonymGenerator();
      const synonyms = await generator.generateSynonymRings();
      
      // Save to auto-generated path (cleared on shutdown)
      const synonymPath = path.join(pathManager.getNotebookDir(), 'synonym-ring-auto.json');
      await generator.saveSynonymRings(synonyms, synonymPath);
      console.log(`[Startup] Generated ${Object.keys(synonyms).length} synonym rings.`);
    } catch (error: any) {
      console.warn('[Startup] Synonym generation failed:', error.message);
      console.warn('[Startup] Search will work without synonym expansion.');
    }

    console.log('[Startup] All derived data regenerated. System ready.');


  } catch (error) {
    console.error("Failed to start Anchor Context Engine:", error);
    process.exit(1);
  }
}

// Windows graceful shutdown fix
process.on("SIGINT", async () => {
  try {
    const { ProcessManager } = await import("./utils/process-manager.js");
    ProcessManager.getInstance().stopAll();
    await db.close();

    // Standard 110: Ephemeral Index Architecture
    // Clear ALL derived data on shutdown - only inbox/ is source of truth
    
    // 1. Wipe PGlite Database (index/cache)
    const dbPath = process.env.PGLITE_DB_PATH || pathManager.getDatabasePath();
    if (existsSync(dbPath)) {
      console.log(`[Shutdown] Wiping PGlite database (rebuildable index)...`);
      rmSync(dbPath, { recursive: true, force: true });
      console.log(`[Shutdown] Database wiped.`);
    }

    // 2. Clear mirrored_brain/ (extracted from inbox/, regenerated on start)
    const { MIRRORED_BRAIN_PATH } = await import('./services/mirror/mirror.js');
    if (existsSync(MIRRORED_BRAIN_PATH)) {
      console.log(`[Shutdown] Clearing mirrored_brain/ (regenerated from inbox/ on start)...`);
      rmSync(MIRRORED_BRAIN_PATH, { recursive: true, force: true });
      console.log(`[Shutdown] mirrored_brain/ cleared.`);
    }

    // 3. Clear Auto-Generated Synonym Rings (derived from data, regenerated on start)
    const synonymPath = path.join(pathManager.getNotebookDir(), 'synonym-ring-auto.json');
    if (existsSync(synonymPath)) {
      console.log(`[Shutdown] Clearing auto-generated synonym rings...`);
      rmSync(synonymPath, { force: true });
      console.log(`[Shutdown] Synonym rings cleared.`);
    }

    // 4. Clear Tag Audit Cache (derived from tags, regenerated on demand)
    const tagAuditPath = path.join(pathManager.getNotebookDir(), 'tag-audit-cache.json');
    if (existsSync(tagAuditPath)) {
      console.log(`[Shutdown] Clearing tag audit cache...`);
      rmSync(tagAuditPath, { force: true });
      console.log(`[Shutdown] Tag audit cache cleared.`);
    }

    console.log(`[Shutdown] Cleanup complete.`);
    console.log(`[Shutdown] Source of truth preserved: inbox/ + external-inbox/`);
    console.log(`[Shutdown] On restart: mirror + index + synonyms regenerated from inbox/`);

    process.exit(0);
  } catch (e) {
    console.error('[Shutdown] Error during cleanup:', e);
    process.exit(1);
  }
});

// Memory warning event handler
import { resourceManager } from './utils/resource-manager.js';
process.on('warning', (warning) => {
  console.warn('Process warning:', warning.name, warning.message);
  if (warning.name.includes('Memory') || warning.message.includes('heap')) {
    console.log('Performing memory optimization due to warning...');
    resourceManager.optimizeMemory();
  }
});

// Initialize Idle Manager for automatic memory cleanup during inactivity
import { idleManager } from './services/idle-manager.js';
console.log('[IdleManager] Service initialized');

startServer();
export { app };