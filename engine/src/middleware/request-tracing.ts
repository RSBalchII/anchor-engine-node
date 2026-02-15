/**
 * Request Tracing Middleware for Anchor Engine
 * 
 * Implements comprehensive request tracing for debugging and monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logWithContext } from '../utils/structured-logger.js';
import { performanceMonitor } from '../utils/performance-monitor.js';

// Extend the Express Request interface to include trace information
declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      traceInfo?: TraceInfo;
    }
  }
}

export interface TraceInfo {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  ip: string;
  userAgent?: string;
  userId?: string;
  duration?: number;
  statusCode?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export const requestTracingMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Generate a unique trace ID for this request
    const traceId = uuidv4();

    // Add trace ID to request for later use
    req.traceId = traceId;

    // Capture initial request information
    const traceInfo: TraceInfo = {
      id: traceId,
      timestamp: Date.now(),
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress || '',
      userAgent: req.get('User-Agent') || undefined,
      userId: req.get('X-User-ID') || (req.headers['x-user-id'] as string) || undefined, // Using header instead of session
      metadata: {
        headers: getTraceableHeaders(req),
        query: req.query,
        params: req.params
      }
    };

    // Store trace info in request
    req.traceInfo = traceInfo;

    // Log the start of the request
    logWithContext.info('Request started', {
      traceId,
      method: req.method,
      url: req.url,
      ip: traceInfo.ip,
      userAgent: traceInfo.userAgent
    });

    // Start performance tracking for this request
    const endTiming = performanceMonitor.startOperation(`request-${req.method}-${req.route?.path || 'unknown'}`);

    // Hook into the response to capture completion details
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any, callback?: any) {
      // Calculate duration
      const duration = Date.now() - traceInfo.timestamp;
      traceInfo.duration = duration;
      traceInfo.statusCode = res.statusCode;

      // End performance tracking
      endTiming();

      // Log the completion of the request
      logWithContext.info('Request completed', {
        traceId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        ip: traceInfo.ip
      });

      // If there was an error status, log it specifically
      if (res.statusCode >= 400) {
        logWithContext.warn('Request completed with error status', {
          traceId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          ip: traceInfo.ip
        });
      }

      // Call the original end method
      return originalEnd.call(this, chunk, encoding, callback);
    };

    // Handle errors in the request chain
    req.on('error', (error: Error) => {
      traceInfo.error = error.message;
      logWithContext.error('Request error', error, {
        traceId,
        method: req.method,
        url: req.url,
        ip: traceInfo.ip
      });
    });

    next();
  };
}

// Function to extract traceable headers (avoid logging sensitive data)
function getTraceableHeaders(req: Request): Record<string, string> {
  const traceableHeaders: Record<string, string> = {};
  const traceableHeaderNames = [
    'content-type',
    'content-length',
    'user-agent',
    'referer',
    'x-request-id',
    'x-correlation-id',
    'authorization', // Only the prefix will be logged
    'x-forwarded-for',
    'x-real-ip'
  ];

  for (const [key, value] of Object.entries(req.headers)) {
    if (traceableHeaderNames.includes(key.toLowerCase())) {
      if (key.toLowerCase() === 'authorization' && typeof value === 'string') {
        // Only log the auth scheme, not the full token
        const [scheme] = value.split(' ');
        traceableHeaders[key] = `${scheme} [REDACTED]`;
      } else {
        traceableHeaders[key] = Array.isArray(value) ? value.join(', ') : value as string;
      }
    }
  }

  return traceableHeaders;
}