/**
 * Performance Monitor for Anchor Engine
 * 
 * Tracks performance metrics and provides monitoring capabilities
 */

export interface PerformanceMetric {
  operation: string;
  count: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  lastDuration: number;
  averageDuration: number;
}

export interface PerformanceStats {
  [operation: string]: PerformanceMetric;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric>;
  private startTime: number;

  constructor() {
    this.metrics = new Map();
    this.startTime = Date.now();
  }

  /**
   * Start timing an operation
   */
  startOperation(operation: string): () => void {
    const startTime = process.hrtime.bigint();

    return () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert nanoseconds to milliseconds

      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, {
          operation,
          count: 0,
          totalDuration: 0,
          minDuration: Infinity,
          maxDuration: -Infinity,
          lastDuration: 0,
          averageDuration: 0
        });
      }

      const metric = this.metrics.get(operation)!;
      metric.count++;
      metric.totalDuration += duration;
      metric.minDuration = Math.min(metric.minDuration, duration);
      metric.maxDuration = Math.max(metric.maxDuration, duration);
      metric.lastDuration = duration;
      metric.averageDuration = metric.totalDuration / metric.count;
    };
  }

  /**
   * Record a completed operation with its duration
   */
  recordOperation(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        operation,
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: -Infinity,
        lastDuration: 0,
        averageDuration: 0
      });
    }

    const metric = this.metrics.get(operation)!;
    metric.count++;
    metric.totalDuration += duration;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.lastDuration = duration;
    metric.averageDuration = metric.totalDuration / metric.count;
  }

  /**
   * Get all performance metrics
   */
  getAllMetrics(): PerformanceStats {
    const result: PerformanceStats = {};
    for (const [operation, metric] of this.metrics.entries()) {
      result[operation] = { ...metric };
    }
    return result;
  }

  /**
   * Get a specific metric
   */
  getMetric(operation: string): PerformanceMetric | undefined {
    return this.metrics.get(operation);
  }

  /**
   * Get the slowest operations
   */
  getSlowestOperations(limit: number = 5): PerformanceMetric[] {
    const sorted = Array.from(this.metrics.values())
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, limit);
    return sorted;
  }

  /**
   * Get the busiest operations
   */
  getBusiestOperations(limit: number = 5): PerformanceMetric[] {
    const sorted = Array.from(this.metrics.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    return sorted;
  }

  /**
   * Record a metric value
   */
  recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        operation,
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: -Infinity,
        lastDuration: 0,
        averageDuration: 0
      });
    }

    const metric = this.metrics.get(operation)!;
    metric.count++;
    metric.totalDuration += duration;
    metric.averageDuration = metric.totalDuration / metric.count;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.lastDuration = duration;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.startTime = Date.now();
  }

  /**
   * Get system performance information
   */
  getSystemStats() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers
      },
      uptime,
      timestamp: Date.now(),
      processId: process.pid
    };
  }

  /**
   * Get all performance statistics
   */
  getAllStats() {
    const result: any = {};
    for (const [operation, metric] of this.metrics.entries()) {
      result[operation] = {
        count: metric.count,
        totalDuration: metric.totalDuration,
        averageDuration: metric.count > 0 ? metric.totalDuration / metric.count : 0,
        minDuration: metric.minDuration === Infinity ? 0 : metric.minDuration,
        maxDuration: metric.maxDuration === -Infinity ? 0 : metric.maxDuration,
        lastDuration: metric.lastDuration
      };
    }
    return result;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const allStats = this.getAllStats();
    const totalOperations = Object.keys(allStats).length;
    const totalCalls = Object.values(allStats).reduce((sum: number, stat: any) => sum + (stat.count || 0), 0);
    const totalDuration = Object.values(allStats).reduce((sum: number, stat: any) => sum + (stat.totalDuration || 0), 0);
    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

    return {
      totalOperations,
      totalCalls,
      totalDuration,
      avgDuration,
      stats: allStats
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

