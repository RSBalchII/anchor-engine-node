/**
 * Health Check Routes for ECE
 * 
 * Implements health check endpoints following Standard 058: UniversalRAG API
 */

import express, { Request, Response } from 'express';
import { healthCheckService } from '../services/health-check-enhanced.js';

export function setupHealthRoutes(app: express.Application) {
  // Enhanced health check endpoint
  app.get('/health', async (_req: Request, res: Response) => {
    try {
      const healthStatus = await healthCheckService.checkHealth();

      // Set appropriate status code based on health
      const statusCode = healthStatus.status === 'healthy' ? 200 :
        healthStatus.status === 'degraded' ? 207 : 503;

      if (statusCode === 503) {
        console.error('[Health] System Unhealthy! Components:', JSON.stringify(healthStatus.components.filter(c => c.status === 'unhealthy'), null, 2));
      }

      res.status(statusCode).json({
        status: healthStatus.status,
        timestamp: new Date(healthStatus.timestamp).toISOString(),
        uptime: healthStatus.uptime,
        components: healthStatus.components,
        system: {
          platform: healthStatus.system.platform,
          arch: healthStatus.system.arch,
          uptime: process.uptime(),
          version: '3.0.0'
        }
      });
    } catch (error: any) {
      console.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Detailed component health endpoints
  app.get('/health/database', async (_req: Request, res: Response) => {
    try {
      const healthStatus = await healthCheckService.checkHealth();
      const dbHealth = healthStatus.components.find(c => c.name === 'database');

      if (dbHealth) {
        const statusCode = dbHealth.status === 'healthy' ? 200 :
          dbHealth.status === 'degraded' ? 207 : 503;

        res.status(statusCode).json(dbHealth);
      } else {
        res.status(500).json({ error: 'Database health check not available' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/health/native', async (_req: Request, res: Response) => {
    try {
      const healthStatus = await healthCheckService.checkHealth();
      const nativeHealth = healthStatus.components.find(c => c.name === 'native-modules');

      if (nativeHealth) {
        const statusCode = nativeHealth.status === 'healthy' ? 200 :
          nativeHealth.status === 'degraded' ? 207 : 503;

        res.status(statusCode).json(nativeHealth);
      } else {
        res.status(500).json({ error: 'Native module health check not available' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/health/system', async (_req: Request, res: Response) => {
    try {
      const healthStatus = await healthCheckService.checkHealth();

      res.status(200).json({
        status: healthStatus.status,
        system: healthStatus.system,
        timestamp: new Date(healthStatus.timestamp).toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}