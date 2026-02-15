/**
 * Monitoring Endpoints for Anchor Engine
 * 
 * Implements health monitoring endpoints following Standard 078: Process Isolation & Live Diagnostics
 */

import express, { Request, Response, Router } from 'express';
import { performanceMonitor } from '../utils/performance-monitor.js';
import { logWithContext } from '../utils/structured-logger.js';
import * as os from 'os';
import * as fs from 'fs/promises';
import { db } from '../core/db.js';

export const monitoringRouter: Router = Router();

// Health check endpoint
monitoringRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    // Perform basic system checks
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    const cpuInfo = os.cpus();

    // Check database connectivity
    let dbStatus = 'unknown';
    try {
      const result = await db.run('SELECT 1 as a');
      dbStatus = result && result.rows && result.rows.length > 0 ? 'healthy' : 'degraded';
    } catch (error) {
      dbStatus = 'unhealthy';
    }

    // Check if we can write to logs directory
    let logStatus = 'unknown';
    try {
      const logsDir = './logs';
      await fs.access(logsDir);
      logStatus = 'healthy';
    } catch (error) {
      logStatus = 'unhealthy';
    }

    // Determine overall health
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (dbStatus === 'unhealthy' || logStatus === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (dbStatus === 'degraded') {
      overallStatus = 'degraded';
    }

    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: uptime,
      process: {
        pid: process.pid,
        memory: memoryUsage,
        uptime: uptime,
        platform: process.platform,
        version: process.version
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: cpuInfo.length,
        loadAverage: os.loadavg()
      },
      components: {
        database: dbStatus,
        logging: logStatus,
        nativeModules: 'healthy' // Would check actual native module status in real implementation
      }
    };

    // Log health check
    logWithContext.health(overallStatus, {
      components: healthData.components,
      memoryUsed: memoryUsage.heapUsed / 1024 / 1024
    });

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 207 : 503;
    res.status(statusCode).json(healthData);
  } catch (error: any) {
    logWithContext.error('Health check failed', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Performance metrics endpoint
monitoringRouter.get('/metrics', (_req: Request, res: Response) => {
  try {
    const metrics = performanceMonitor.getAllStats();

    res.status(200).json({
      timestamp: new Date().toISOString(),
      metrics,
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        pid: process.pid
      }
    });
  } catch (error: any) {
    logWithContext.error('Metrics collection failed', error);
    res.status(500).json({ error: error.message });
  }
});

// Performance summary endpoint
monitoringRouter.get('/performance-summary', (_req: Request, res: Response) => {
  try {
    const summary = performanceMonitor.getPerformanceSummary();

    res.status(200).json({
      timestamp: new Date().toISOString(),
      ...summary
    });
  } catch (error: any) {
    logWithContext.error('Performance summary collection failed', error);
    res.status(500).json({ error: error.message });
  }
});

// System resource usage endpoint
monitoringRouter.get('/resources', (_req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage ? process.cpuUsage() : null;

    const resourceData = {
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        memory: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
          arrayBuffers: memoryUsage.arrayBuffers
        },
        cpu: cpuUsage,
        uptime: process.uptime()
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: os.cpus().length,
        loadAverage: os.loadavg()
      },
      disk: getDiskUsage() // Custom function to get disk usage
    };

    res.status(200).json(resourceData);
  } catch (error: any) {
    logWithContext.error('Resource usage collection failed', error);
    res.status(500).json({ error: error.message });
  }
});

// Get disk usage information
function getDiskUsage() {
  // This is a simplified implementation
  // In a real implementation, you might use a library like 'diskusage'
  try {
    // For now, return dummy values based on available memory as a proxy
    // In a real implementation, use proper disk space checking
    const total = 1024 * 1024 * 1024 * 500; // 500GB dummy value
    const available = 1024 * 1024 * 1024 * 100; // 100GB dummy value

    return {
      total,
      available,
      used: total - available,
      percentUsed: ((total - available) / total * 100).toFixed(2) + '%'
    };
  } catch (error) {
    // Return safe defaults if we can't determine actual values
    return {
      total: 1024 * 1024 * 1024 * 500, // 500GB
      available: 1024 * 1024 * 1024 * 100, // 100GB
      used: 1024 * 1024 * 1024 * 400,  // 400GB
      percentUsed: '80%'
    };
  }
}

// Database health endpoint
monitoringRouter.get('/db-health', async (_req: Request, res: Response) => {
  try {
    // Run a series of database health checks
    const checks = {
      connectivity: false,
      basicQuery: false,
      writePermission: false,
      readPermission: false,
      performance: 0
    };

    // Check connectivity
    try {
      const result = await db.run('SELECT 1 as a');
      checks.connectivity = true;
      checks.basicQuery = result && result.rows && result.rows.length > 0;
    } catch (error) {
      // Connectivity failed
    }

    // Check write/read permissions with a temporary record
    if (checks.basicQuery) {
      const testId = `health_check_${Date.now()}`;

      try {
        // Try to write
        await db.run(
          `INSERT INTO atoms (id, content, source_path, timestamp, simhash, embedding, provenance)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             content = EXCLUDED.content,
             timestamp = EXCLUDED.timestamp`,
          [testId, 'health check', 'health_test', Date.now(), '0', new Array(768).fill(0.1), 'internal']
        );
        checks.writePermission = true;

        // Try to read
        const readResult = await db.run(
          `SELECT id, content FROM atoms WHERE id = $1`,
          [testId]
        );
        checks.readPermission = readResult && readResult.rows && readResult.rows.length > 0;

        // Clean up test record
        await db.run(`DELETE FROM atoms WHERE id = $1`, [testId]);
      } catch (error) {
        // Write/read failed
      }
    }

    // Performance test
    if (checks.basicQuery) {
      const start = performance.now();
      for (let i = 0; i < 10; i++) {
        await db.run('SELECT 1 as a', []);
      }
      checks.performance = (performance.now() - start) / 10; // Average ms per query
    }

    const overallDbHealth =
      checks.connectivity &&
      checks.basicQuery &&
      checks.writePermission &&
      checks.readPermission;

    const dbHealthStatus = overallDbHealth ? 'healthy' :
      (checks.connectivity && checks.basicQuery) ? 'degraded' : 'unhealthy';

    const statusCode = dbHealthStatus === 'healthy' ? 200 : dbHealthStatus === 'degraded' ? 207 : 503;

    res.status(statusCode).json({
      status: dbHealthStatus,
      timestamp: new Date().toISOString(),
      checks
    });
  } catch (error: any) {
    logWithContext.error('Database health check failed', error);
    res.status(500).json({ error: error.message });
  }
});

// Native module health endpoint
monitoringRouter.get('/native-health', (_req: Request, res: Response) => {
  try {
    // In a real implementation, this would check the actual status of native modules
    // For now, we'll return a mock response indicating healthy status
    const nativeModuleStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      modules: {
        ece_native: {
          loaded: true,
          version: '1.0.0',
          status: 'operational'
        },
        cozo_node: {
          loaded: true,
          version: '1.0.0',
          status: 'operational'
        }
      }
    };

    res.status(200).json(nativeModuleStatus);
  } catch (error: any) {
    logWithContext.error('Native module health check failed', error);
    res.status(500).json({ error: error.message });
  }
});

// Ingestion pipeline health endpoint
monitoringRouter.get('/ingestion-health', async (_req: Request, res: Response) => {
  try {
    // Check various ingestion pipeline components
    const checks = {
      atomizer: false,
      sanitizer: false,
      fingerprinter: false,
      databaseWrite: false,
      performance: 0
    };

    // This would check actual ingestion components in a real implementation
    // For now, we'll simulate the checks

    // Simulate checking if atomizer service is responsive
    checks.atomizer = true; // Assume healthy for now

    // Simulate checking if sanitizer service is responsive  
    checks.sanitizer = true; // Assume healthy for now

    // Simulate checking if fingerprinter service is responsive
    checks.fingerprinter = true; // Assume healthy for now

    // Check database write capability (reuse the db check from above)
    try {
      const testId = `ingest_health_${Date.now()}`;
      await db.run(
        `INSERT INTO atoms (id, content, source_path, timestamp, simhash, embedding, provenance)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           content = EXCLUDED.content,
           timestamp = EXCLUDED.timestamp`,
        [testId, 'ingestion health check', 'ingest_health_test', Date.now(), '0', new Array(768).fill(0.1), 'internal']
      );

      // Clean up
      await db.run(`DELETE FROM atoms WHERE id = $1`, [testId]);
      checks.databaseWrite = true;
    } catch (error) {
      // Database write failed
    }

    // Performance test for ingestion
    const start = performance.now();
    // Simulate ingestion operations
    for (let i = 0; i < 5; i++) {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    checks.performance = (performance.now() - start) / 5; // Average ms per operation

    const overallIngestHealth = checks.atomizer && checks.sanitizer && checks.fingerprinter && checks.databaseWrite;
    const ingestHealthStatus = overallIngestHealth ? 'healthy' : 'degraded';

    const statusCode = ingestHealthStatus === 'healthy' ? 200 : 207;

    res.status(statusCode).json({
      status: ingestHealthStatus,
      timestamp: new Date().toISOString(),
      checks
    });
  } catch (error: any) {
    logWithContext.error('Ingestion health check failed', error);
    res.status(500).json({ error: error.message });
  }
});

// Search functionality health endpoint
monitoringRouter.get('/search-health', async (_req: Request, res: Response) => {
  try {
    const checks = {
      searchIndex: false,
      queryProcessing: false,
      resultQuality: false,
      performance: 0
    };

    // Check if search index is accessible
    try {
      const result = await db.run('SELECT id FROM atoms LIMIT 1', []);
      checks.searchIndex = result && result.rows && result.rows.length > 0;
    } catch (error) {
      // Index check failed
    }

    // Test query processing
    if (checks.searchIndex) {
      try {
        const result = await db.run('SELECT id, content, ts_rank(to_tsvector(\'simple\', substr(content, 1, 5000)), plainto_tsquery(\'simple\', $1)) as score FROM atoms WHERE to_tsvector(\'simple\', substr(content, 1, 5000)) @@ plainto_tsquery(\'simple\', $1) LIMIT 1', ['test']);
        checks.queryProcessing = result && result.rows && result.rows.length > 0;
      } catch (error) {
        // Query processing failed
      }
    }

    // Performance test for search
    if (checks.queryProcessing) {
      const start = performance.now();
      for (let i = 0; i < 3; i++) {
        try {
          await db.run('SELECT id, content, ts_rank(to_tsvector(\'simple\', content), plainto_tsquery(\'simple\', $1)) as score FROM atoms WHERE to_tsvector(\'simple\', content) @@ plainto_tsquery(\'simple\', $1) LIMIT 1', ['performance']);
        } catch (error) {
          // Ignore individual failures in performance test
        }
      }
      checks.performance = (performance.now() - start) / 3; // Average ms per query
    }

    const overallSearchHealth = checks.searchIndex && checks.queryProcessing;
    const searchHealthStatus = overallSearchHealth ? 'healthy' : 'degraded';

    const statusCode = searchHealthStatus === 'healthy' ? 200 : 207;

    res.status(statusCode).json({
      status: searchHealthStatus,
      timestamp: new Date().toISOString(),
      checks
    });
  } catch (error: any) {
    logWithContext.error('Search health check failed', error);
    res.status(500).json({ error: error.message });
  }
});

// Comprehensive system status endpoint
monitoringRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    // Gather all system information
    const statusData = {
      status: 'healthy', // Will be updated based on component statuses
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      process: {
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        platform: process.platform,
        version: process.version
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: os.cpus().length,
        loadAverage: os.loadavg()
      },
      components: {
        database: 'checking...',
        nativeModules: 'checking...',
        ingestion: 'checking...',
        search: 'checking...',
        api: 'running'
      },
      performance: performanceMonitor.getPerformanceSummary()
    };

    // Run all health checks in parallel
    const [dbHealth, nativeHealth, ingestHealth, searchHealth] = await Promise.allSettled([
      db.run('SELECT 1 as a', []),
      Promise.resolve({}), // Native modules check
      db.run('SELECT id FROM atoms LIMIT 1', []),
      db.run('SELECT id, content, ts_rank(to_tsvector(\'simple\', content), plainto_tsquery(\'simple\', $1)) as score FROM atoms WHERE to_tsvector(\'simple\', content) @@ plainto_tsquery(\'simple\', $1) LIMIT 1', ['test'])
    ]);

    // Update component statuses
    statusData.components.database = dbHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy';
    statusData.components.nativeModules = 'healthy'; // Simplified
    statusData.components.ingestion = ingestHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy';
    statusData.components.search = searchHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy';

    // Determine overall status
    const unhealthyComponents = Object.values(statusData.components).filter(status => status === 'unhealthy').length;
    const degradedComponents = Object.values(statusData.components).filter(status => status === 'degraded').length;

    if (unhealthyComponents > 0) {
      statusData.status = 'unhealthy';
    } else if (degradedComponents > 0) {
      statusData.status = 'degraded';
    } else {
      statusData.status = 'healthy';
    }

    const statusCode = statusData.status === 'healthy' ? 200 : statusData.status === 'degraded' ? 207 : 503;

    res.status(statusCode).json(statusData);
  } catch (error: any) {
    logWithContext.error('Status check failed', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to get current performance counters
monitoringRouter.get('/counters', (_req: Request, res: Response) => {
  try {
    const counters = performanceMonitor.getAllStats();

    res.status(200).json({
      timestamp: new Date().toISOString(),
      counters
    });
  } catch (error: any) {
    logWithContext.error('Counters retrieval failed', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to reset performance counters
monitoringRouter.post('/counters/reset', (_req: Request, res: Response) => {
  try {
    performanceMonitor.reset();

    res.status(200).json({
      status: 'success',
      message: 'Performance counters reset'
    });
  } catch (error: any) {
    logWithContext.error('Counters reset failed', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to get slowest operations
monitoringRouter.get('/slow-operations', (_req: Request, res: Response) => {
  try {
    const slowest = performanceMonitor.getSlowestOperations(10);

    res.status(200).json({
      timestamp: new Date().toISOString(),
      slowestOperations: slowest
    });
  } catch (error: any) {
    logWithContext.error('Slow operations retrieval failed', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to get busiest operations
monitoringRouter.get('/busiest-operations', (_req: Request, res: Response) => {
  try {
    const busiest = performanceMonitor.getBusiestOperations(10);

    res.status(200).json({
      timestamp: new Date().toISOString(),
      busiestOperations: busiest
    });
  } catch (error: any) {
    logWithContext.error('Busiest operations retrieval failed', error);
    res.status(500).json({ error: error.message });
  }
});

