/**
 * Request Tracing System for ECE_Core
 * 
 * Implements comprehensive request tracing for debugging and monitoring
 * following Standard 078: Process Isolation & Live Diagnostics
 */

import { v4 as uuidv4 } from 'uuid';
import { logWithContext } from '../utils/structured-logger.js';
import { performanceMonitor } from '../utils/performance-monitor.js';

export interface TraceSpan {
  id: string;
  parentId?: string;
  traceId: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'started' | 'completed' | 'error';
  tags?: Record<string, any>;
  logs?: Array<{
    timestamp: number;
    level: string;
    message: string;
    fields?: Record<string, any>;
  }>;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentId?: string;
}

export class RequestTracer {
  private static instance: RequestTracer;
  private activeSpans: Map<string, TraceSpan>;
  private traceContext: WeakMap<object, TraceContext>;

  private constructor() {
    this.activeSpans = new Map();
    this.traceContext = new WeakMap();
  }

  public static getInstance(): RequestTracer {
    if (!RequestTracer.instance) {
      RequestTracer.instance = new RequestTracer();
    }
    return RequestTracer.instance;
  }

  /**
   * Start a new trace for a request
   */
  startTrace(operation: string, tags?: Record<string, any>): TraceContext {
    const traceId = uuidv4();
    const spanId = uuidv4();
    
    const span: TraceSpan = {
      id: spanId,
      traceId,
      operation,
      startTime: Date.now(),
      status: 'started',
      tags
    };
    
    this.activeSpans.set(spanId, span);
    
    const context: TraceContext = {
      traceId,
      spanId
    };
    
    logWithContext.info('TRACE_START', {
      traceId,
      spanId,
      operation,
      tags
    });
    
    return context;
  }

  /**
   * Start a child span within a trace
   */
  startChildSpan(
    parentContext: TraceContext,
    operation: string,
    tags?: Record<string, any>
  ): TraceContext {
    const spanId = uuidv4();
    const span: TraceSpan = {
      id: spanId,
      parentId: parentContext.spanId,
      traceId: parentContext.traceId,
      operation,
      startTime: Date.now(),
      status: 'started',
      tags
    };
    
    this.activeSpans.set(spanId, span);
    
    const context: TraceContext = {
      traceId: parentContext.traceId,
      spanId,
      parentId: parentContext.spanId
    };
    
    logWithContext.info('SPAN_START', {
      traceId: parentContext.traceId,
      spanId,
      parentId: parentContext.spanId,
      operation,
      tags
    });
    
    return context;
  }

  /**
   * End a trace span
   */
  endTrace(context: TraceContext, status: 'completed' | 'error' = 'completed', tags?: Record<string, any>): void {
    const span = this.activeSpans.get(context.spanId);
    if (!span) {
      logWithContext.warn('Attempted to end non-existent span', {
        spanId: context.spanId,
        traceId: context.traceId
      });
      return;
    }
    
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
    
    if (tags) {
      span.tags = { ...span.tags, ...tags };
    }
    
    // Update the span in the map
    this.activeSpans.set(context.spanId, span);
    
    logWithContext.info('TRACE_END', {
      traceId: context.traceId,
      spanId: context.spanId,
      operation: span.operation,
      duration: span.duration,
      status,
      tags
    });
    
    // Record performance metric
    if (span.duration) {
      performanceMonitor.recordOperation(`${span.operation}_duration`, span.duration);
    }
  }

  /**
   * Add a log to a trace span
   */
  addLog(context: TraceContext, level: string, message: string, fields?: Record<string, any>): void {
    const span = this.activeSpans.get(context.spanId);
    if (!span) {
      return; // Silently fail if span doesn't exist
    }
    
    if (!span.logs) {
      span.logs = [];
    }
    
    span.logs.push({
      timestamp: Date.now(),
      level,
      message,
      fields
    });
    
    // Update the span in the map
    this.activeSpans.set(context.spanId, span);
  }

  /**
   * Add tags to a trace span
   */
  addTags(context: TraceContext, tags: Record<string, any>): void {
    const span = this.activeSpans.get(context.spanId);
    if (!span) {
      return; // Silently fail if span doesn't exist
    }
    
    if (!span.tags) {
      span.tags = {};
    }
    
    span.tags = { ...span.tags, ...tags };
    
    // Update the span in the map
    this.activeSpans.set(context.spanId, span);
  }

  /**
   * Get trace information for debugging
   */
  getTrace(traceId: string): TraceSpan[] | null {
    const spans = Array.from(this.activeSpans.values()).filter(span => span.traceId === traceId);
    return spans.length > 0 ? spans : null;
  }

  /**
   * Get active spans for a trace
   */
  getActiveSpans(traceId: string): TraceSpan[] {
    return Array.from(this.activeSpans.values()).filter(
      span => span.traceId === traceId && span.status === 'started'
    );
  }

  /**
   * Get all completed spans for a trace
   */
  getCompletedSpans(traceId: string): TraceSpan[] {
    return Array.from(this.activeSpans.values()).filter(
      span => span.traceId === traceId && span.status === 'completed'
    );
  }

  /**
   * Get trace summary
   */
  getTraceSummary(traceId: string): {
    traceId: string;
    totalSpans: number;
    completedSpans: number;
    errorSpans: number;
    totalDuration: number;
    operations: string[];
  } | null {
    const allSpans = this.getTrace(traceId);
    if (!allSpans) return null;
    
    const completedSpans = allSpans.filter(s => s.status === 'completed');
    const errorSpans = allSpans.filter(s => s.status === 'error');
    
    const totalDuration = Math.max(
      ...allSpans.map(s => s.duration || 0)
    );
    
    const operations = [...new Set(allSpans.map(s => s.operation))];
    
    return {
      traceId,
      totalSpans: allSpans.length,
      completedSpans: completedSpans.length,
      errorSpans: errorSpans.length,
      totalDuration,
      operations
    };
  }

  /**
   * Export trace data for external analysis
   */
  exportTrace(traceId: string): any {
    const spans = this.getTrace(traceId);
    if (!spans) return null;
    
    // Format for OpenTelemetry-compatible export
    return {
      traceId,
      spans: spans.map(span => ({
        spanId: span.id,
        parentId: span.parentId,
        operation: span.operation,
        startTime: new Date(span.startTime).toISOString(),
        endTime: span.endTime ? new Date(span.endTime).toISOString() : null,
        duration: span.duration,
        status: span.status,
        tags: span.tags || {},
        logs: span.logs || []
      }))
    };
  }

  /**
   * Clear expired traces (older than specified minutes)
   */
  clearExpiredTraces(maxAgeMinutes: number = 30): number {
    const cutoffTime = Date.now() - (maxAgeMinutes * 60 * 1000);
    let clearedCount = 0;
    
    for (const [spanId, span] of this.activeSpans.entries()) {
      // If span is completed and older than maxAge, remove it
      if (span.status !== 'started' && span.endTime && span.endTime < cutoffTime) {
        this.activeSpans.delete(spanId);
        clearedCount++;
      }
    }
    
    return clearedCount;
  }

  /**
   * Get all trace IDs
   */
  getAllTraceIds(): string[] {
    const traceIds = new Set<string>();
    for (const span of this.activeSpans.values()) {
      traceIds.add(span.traceId);
    }
    return Array.from(traceIds);
  }

  /**
   * Get recent traces (sorted by start time)
   */
  getRecentTraces(limit: number = 50): string[] {
    const traces = Array.from(this.activeSpans.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit)
      .map(span => span.traceId);
    
    return [...new Set(traces)]; // Remove duplicates
  }

  /**
   * Get slowest traces based on total duration
   */
  getSlowestTraces(limit: number = 10): Array<{ traceId: string; duration: number }> {
    const traceDurations = new Map<string, number>();

    for (const span of this.activeSpans.values()) {
      if (span.duration) {
        const existing = traceDurations.get(span.traceId) || 0;
        traceDurations.set(span.traceId, Math.max(existing, span.duration));
      }
    }

    return Array.from(traceDurations.entries())
      .map(([traceId, duration]) => ({ traceId, duration }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Record a performance metric (for compatibility with older code)
   */
  record(operation: string, value: number) {
    // For backward compatibility, we'll use the performance monitor if available
    // This is a simple implementation - in a real system, you'd want to integrate
    // with the actual performance monitoring system
    console.log(`[RequestTracer] Recording metric: ${operation} = ${value}`);
  }
}

// Create a global instance
export const requestTracer = RequestTracer.getInstance();

// Context manager for request context propagation
export class RequestContextManager {
  private static contextKey = 'request-context';

  /**
   * Set request context in the current execution context
   */
  static setContext(context: TraceContext): void {
    // In a real implementation, this would use AsyncLocalStorage or similar
    // For now, we'll use a global variable as a placeholder
    (global as any)[RequestContextManager.contextKey] = context;
  }

  /**
   * Get request context from the current execution context
   */
  static getContext(): TraceContext | null {
    const context = (global as any)[RequestContextManager.contextKey];
    return context || null;
  }

  /**
   * Clear request context
   */
  static clearContext(): void {
    delete (global as any)[RequestContextManager.contextKey];
  }

  /**
   * Execute a function with request context
   */
  static async withContext<T>(context: TraceContext, fn: () => Promise<T>): Promise<T> {
    const previousContext = RequestContextManager.getContext();
    RequestContextManager.setContext(context);
    
    try {
      return await fn();
    } finally {
      RequestContextManager.setContext(previousContext || context);
    }
  }
}

// Export a function to trace an operation
export async function traceOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  tags?: Record<string, any>,
  parentContext?: TraceContext
): Promise<T> {
  const context = parentContext 
    ? requestTracer.startChildSpan(parentContext, operation, tags)
    : requestTracer.startTrace(operation, tags);
  
  try {
    const result = await fn();
    requestTracer.endTrace(context, 'completed');
    return result;
  } catch (error) {
    requestTracer.endTrace(context, 'error', { error: (error as Error).message });
    throw error;
  }
}

// Export a function to trace an ingestion operation specifically
export async function traceIngestion<T>(
  content: string,
  source: string,
  fn: () => Promise<T>
): Promise<T> {
  const context = requestTracer.startTrace('ingestion', {
    source,
    contentLength: content.length,
    operation: 'ingest'
  });
  
  try {
    const result = await fn();
    requestTracer.endTrace(context, 'completed', {
      status: 'success'
    });
    return result;
  } catch (error) {
    requestTracer.endTrace(context, 'error', {
      status: 'failed',
      error: (error as Error).message
    });
    throw error;
  }
}

// Export a function to trace a search operation specifically
export async function traceSearch<T>(
  query: string,
  buckets: string[],
  fn: () => Promise<T>
): Promise<T> {
  const context = requestTracer.startTrace('search', {
    query: query.substring(0, 100), // Truncate long queries
    buckets,
    operation: 'search'
  });
  
  try {
    const result = await fn();
    requestTracer.endTrace(context, 'completed', {
      status: 'success'
    });
    return result;
  } catch (error) {
    requestTracer.endTrace(context, 'error', {
      status: 'failed',
      error: (error as Error).message
    });
    throw error;
  }
}

// Export a function to trace a database operation specifically
export async function traceDatabaseOperation<T>(
  operation: string,
  query: string,
  fn: () => Promise<T>
): Promise<T> {
  const context = requestTracer.startTrace(`db_${operation}`, {
    operation,
    queryLength: query.length,
    operationType: 'database'
  });
  
  try {
    const result = await fn();
    requestTracer.endTrace(context, 'completed', {
      status: 'success'
    });
    return result;
  } catch (error) {
    requestTracer.endTrace(context, 'error', {
      status: 'failed',
      error: (error as Error).message
    });
    throw error;
  }
}

// Export a function to trace a native module operation specifically
export async function traceNativeOperation<T>(
  operation: string,
  module: string,
  fn: () => Promise<T>
): Promise<T> {
  const context = requestTracer.startTrace(`native_${operation}`, {
    module,
    operation,
    operationType: 'native'
  });
  
  try {
    const result = await fn();
    requestTracer.endTrace(context, 'completed', {
      status: 'success'
    });
    return result;
  } catch (error) {
    requestTracer.endTrace(context, 'error', {
      status: 'failed',
      error: (error as Error).message
    });
    throw error;
  }
}