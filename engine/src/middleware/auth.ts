/**
 * API Key Authentication Middleware for Anchor Engine
 * 
 * Validates Bearer token from Authorization header against the configured API key.
 * When no API key is configured (empty string), authentication is disabled (open access).
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

/**
 * Express middleware that validates API key from Authorization header.
 * Reads the key from config.API_KEY (sourced from user_settings.json → server.api_key).
 * If API_KEY is the default placeholder "ece-secret-key" or empty, auth is disabled.
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = config.API_KEY;

  // If no meaningful API key configured, skip authentication (open access)
  if (!apiKey || apiKey === 'ece-secret-key') {
    return next();
  }

  // Allow health endpoints without auth
  if (req.path === '/health' || req.path.startsWith('/health/')) {
    return next();
  }

  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Provide an API key via Authorization: Bearer <key>'
    });
    return;
  }

  // Support "Bearer <key>" format
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (token !== apiKey) {
    res.status(403).json({
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    });
    return;
  }

  next();
}
