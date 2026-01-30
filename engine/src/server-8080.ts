import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { setupRoutes } from './routes/api.js';
import { config } from './config/index.js';
import { db } from './core/db.js';
import { PathManager } from './utils/path-manager.js';

// Initialize path manager
const pathManager = PathManager.getInstance();

// Initialize database
console.log('Initializing database...');
db.init().then(() => {
  console.log('Database initialized successfully');

  // Create Express app
  const app = express();

  // Middleware
  app.use(cors());
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ECE Chat Server (Port 8080)'
    });
  });

  // Setup API routes
  setupRoutes(app);

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  // Start server
  const PORT = 8080;
  app.listen(PORT, () => {
    console.log(`\x1b[36mECE Chat Server running on port ${PORT}\x1b[0m`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    console.log('Ready to serve chat completions for Qwen Code CLI...');
  });
}).catch((error) => {
  console.error('Failed to initialize database:', error);
  // If database initialization fails, try to continue without it for basic API functionality
  console.warn('Continuing without database access - some features may not work');

  // Create Express app anyway
  const app = express();

  // Middleware
  app.use(cors());
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ECE Chat Server (Port 8080) - DB unavailable'
    });
  });

  // Setup API routes
  setupRoutes(app);

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  // Start server
  const PORT = 8080;
  app.listen(PORT, () => {
    console.log(`\x1b[36mECE Chat Server running on port ${PORT}\x1b[0m`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    console.log('Ready to serve chat completions for Qwen Code CLI...');
  });
});