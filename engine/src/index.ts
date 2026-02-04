// engine/src/index.ts
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Fix module load error by using explicit relative path
import { db } from "./core/db.js";
import { config } from "./config/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.PORT;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

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

// Global state tracker
let databaseReady = false;

// Set up static file serving immediately so UI is accessible
app.use("/static", express.static(path.join(__dirname, "../dist")));

const FRONTEND_DIST = path.join(__dirname, "../../frontend/dist");
app.use(express.static(FRONTEND_DIST));

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
        message: "Engine is running and database is responsive"
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
// Basic routes removed - handled by global guard and dynamic setup


// Set up the catch-all route for UI (should be LAST)
// Catch-all moved to end of startServer to avoid intercepting dynamic routes


async function startServer() {
  try {
    console.log("Initializing Sovereign Context Engine...");

    // Start the server immediately so health checks pass
    app.listen(PORT, () => {
      console.log(`Sovereign Context Engine running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
    });

    // Initialize database in the background after server starts
    console.log("Initializing database in the background...");
    await db.init();
    databaseReady = true;
    console.log("Database initialized successfully");

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

    const FRONTEND_DIST = path.join(__dirname, "../../frontend/dist");
    app.use(express.static(FRONTEND_DIST));

    // Set up the catch-all route for UI again (should be LAST)
    app.get("*", (req, res) => {
      if (req.path.startsWith("/v1") || req.path.startsWith("/health")) {
        res.status(404).json({ error: "Not Found" });
        return;
      }
      res.sendFile(path.join(FRONTEND_DIST, "index.html"));
    });


    console.log("Full routes set up, server is ready for all requests");

    // Start other services after database is ready
    const { startWatchdog } = await import("./services/ingest/watchdog.js");
    startWatchdog();

    const { dream } = await import("./services/dreamer/dreamer.js");
    const { config } = await import("./config/index.js");
    try {
      await dream();
    } catch (e) { }

    setInterval(async () => {
      try {
        await dream();
      } catch (e) { }
    }, config.DREAM_INTERVAL_MS);


  } catch (error) {
    console.error("Failed to start:", error);
    process.exit(1);
  }
}

// Windows graceful shutdown fix
process.on("SIGINT", async () => {
  try {
    await db.close();
    process.exit(0);
  } catch (e) {
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

startServer();
export { app };