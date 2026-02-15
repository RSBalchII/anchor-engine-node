/**
 * Minimal test server to verify basic functionality
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Basic middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Basic health check
app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: "minimal-test", 
    timestamp: new Date().toISOString(),
    message: "Minimal server is running"
  });
});

// Serve static files
const FRONTEND_DIST = path.join(__dirname, "../../frontend/dist");
app.use(express.static(FRONTEND_DIST));

// Catch-all route for UI
app.get("*", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Minimal test server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});