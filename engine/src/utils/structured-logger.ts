/**
 * Structured Logger for Anchor Engine
 *
 * Implements standardized, structured logging with metrics collection
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { createHash } from 'crypto';
import { format } from 'winston';

// Define log levels with numerical values
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
  silly: 5
};

// Create logs directory if it doesn't exist
const LOGS_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: 'info',
  format: structuredFormat,
  transports: [
    // Daily rotating file transport for all logs
    new DailyRotateFile({
      filename: path.join(LOGS_DIR, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
      )
    }),
    // Separate error file
    new DailyRotateFile({
      level: 'error',
      filename: path.join(LOGS_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
      )
    }),
    // Console transport for development
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message, timestamp, ...metadata }) => {
          let msg = `${timestamp} [${level}] ${message}`;
          if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
          }
          return msg;
        })
      )
    })
  ]
});

// Performance metrics tracker
class MetricsTracker {
  private metrics: Map<string, { count: number; total: number; min: number; max: number; last: number }>;
  private startTime: number;

  constructor() {
    this.metrics = new Map();
    this.startTime = Date.now();
  }

  startTimer(operation: string): () => number {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric(operation, duration);
      return duration;
    };
  }

  recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, { count: 0, total: 0, min: Infinity, max: -Infinity, last: 0 });
    }

    const metric = this.metrics.get(operation)!;
    metric.count++;
    metric.total += duration;
    metric.min = Math.min(metric.min, duration);
    metric.max = Math.max(metric.max, duration);
    metric.last = duration;
  }

  getMetrics(operation: string) {
    return this.metrics.get(operation);
  }

  getAllMetrics() {
    const result: Record<string, any> = {};
    const now = Date.now();

    for (const [name, data] of this.metrics.entries()) {
      result[name] = {
        count: data.count,
        total: data.total,
        average: data.count > 0 ? data.total / data.count : 0,
        min: data.min === Infinity ? 0 : data.min,
        max: data.max === -Infinity ? 0 : data.max,
        last: data.last,
        uptime: now - this.startTime
      };
    }

    return result;
  }

  reset() {
    this.metrics.clear();
  }
}

// Initialize metrics tracker
const metricsTracker = new MetricsTracker();

// Enhanced logging functions with metrics
export const logWithContext = {
  /**
   * Log an info message with context and metrics
   */
  info: (message: string, context?: Record<string, any>) => {
    if (context && context.metrics) {
      for (const [name, value] of Object.entries(context.metrics)) {
        metricsTracker.recordMetric(name as string, value as number);
      }
    }

    logger.info(message, {
      context,
      pid: process.pid,
      module: 'structured-logger'
    });
  },

  /**
   * Log a warning with context
   */
  warn: (message: string, context?: Record<string, any>) => {
    logger.warn(message, {
      context,
      pid: process.pid,
      module: 'structured-logger'
    });
  },

  /**
   * Log an error with context
   */
  error: (message: string, error?: Error | string, context?: Record<string, any>) => {
    logger.error(message, {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      context,
      pid: process.pid,
      module: 'structured-logger'
    });
  },

  /**
   * Log a debug message with context
   */
  debug: (message: string, context?: Record<string, any>) => {
    logger.debug(message, {
      context,
      pid: process.pid,
      module: 'structured-logger'
    });
  },

  /**
   * Log a performance metric
   */
  performance: (operation: string, duration: number, context?: Record<string, any>) => {
    metricsTracker.recordMetric(operation, duration);

    logger.info('PERFORMANCE_METRIC', {
      operation,
      duration_ms: duration,
      average: metricsTracker.getMetrics(operation)?.total! / metricsTracker.getMetrics(operation)?.count!,
      context,
      pid: process.pid,
      module: 'structured-logger'
    });
  },

  /**
   * Start a timed operation
   */
  startTimer: (operation: string) => {
    return metricsTracker.startTimer(operation);
  },

  /**
   * Get current metrics
   */
  getMetrics: () => {
    return metricsTracker.getAllMetrics();
  },

  /**
   * Log ingestion event
   */
  ingestion: (status: 'success' | 'partial' | 'failed', details: Record<string, any>) => {
    metricsTracker.recordMetric('ingestion_attempts', 1);
    if (status === 'success') {
      metricsTracker.recordMetric('ingestion_successes', 1);
    } else if (status === 'failed') {
      metricsTracker.recordMetric('ingestion_failures', 1);
    }

    logger.info('INGESTION_EVENT', {
      event: 'ingestion',
      status,
      details,
      pid: process.pid,
      module: 'structured-logger'
    });
  },

  /**
   * Log search event
   */
  search: (query: string, resultCount: number, duration: number, context?: Record<string, any>) => {
    metricsTracker.recordMetric('search_queries', 1);
    metricsTracker.recordMetric('search_results', resultCount);
    metricsTracker.recordMetric('search_duration', duration);

    logger.info('SEARCH_EVENT', {
      event: 'search',
      query: query.substring(0, 100), // Truncate long queries
      resultCount,
      duration_ms: duration,
      context,
      pid: process.pid,
      module: 'structured-logger'
    });
  },

  /**
   * Log system health event
   */
  health: (status: 'healthy' | 'degraded' | 'unhealthy', details: Record<string, any>) => {
    logger.info('HEALTH_EVENT', {
      event: 'health-check',
      status,
      details,
      pid: process.pid,
      module: 'structured-logger'
    });
  }
};

// Export the base logger as well
export { logger, metricsTracker };

// Export a function to get formatted metrics for monitoring endpoints
export function getFormattedMetrics(): string {
  const metrics = metricsTracker.getAllMetrics();
  return JSON.stringify(metrics, null, 2);
}