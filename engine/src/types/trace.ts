/**
 * Types for Request Tracing in Anchor Engine
 */

import { Request } from 'express';

// Define the interface for trace information
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

// Extend the Express Request type to include trace information
declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      traceInfo?: TraceInfo;
    }
  }
}

