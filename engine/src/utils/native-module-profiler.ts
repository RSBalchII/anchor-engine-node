/**
 * Native Module Profiler for Anchor Engine
 * 
 * Provides performance profiling for native modules
 */

import { performanceMonitor } from './performance-monitor.js';
import { logWithContext } from './structured-logger.js';

export interface ProfilingConfig {
  operation: string;
  iterations: number;
  testData: any[];
  parameters?: Record<string, any>;
}

export interface ProfileResult {
  operation: string;
  duration: number; // in milliseconds
  memoryBefore: number; // in MB
  memoryAfter: number; // in MB
  memoryDelta: number; // in MB
  iterations: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  lastDuration: number;
  timestamp: number;
}

export class NativeModuleProfiler {
  private profileResults: ProfileResult[] = [];
  private isProfiling: boolean = false;

  /**
   * Profile a native module operation
   */
  async profileOperation(config: ProfilingConfig): Promise<ProfileResult> {
    if (this.isProfiling) {
      throw new Error('Profiler is already running. Wait for current profiling to complete.');
    }

    this.isProfiling = true;
    logWithContext.info(`Starting profiling for operation: ${config.operation}`, {
      operation: config.operation,
      iterations: config.iterations,
      testDataSize: config.testData.length
    });

    const durations: number[] = [];
    let memoryBefore = 0;
    let memoryAfter = 0;

    try {
      // Capture memory before profiling
      memoryBefore = this.getMemoryUsage();

      // Run the operation multiple times
      for (let i = 0; i < config.iterations; i++) {
        const start = process.hrtime.bigint();

        // Execute the operation with test data
        await this.executeOperation(config.operation, config.testData[i % config.testData.length], config.parameters);

        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000; // Convert nanoseconds to milliseconds
        durations.push(duration);
      }

      // Capture memory after profiling
      memoryAfter = this.getMemoryUsage();

      // Calculate statistics
      const totalDuration = durations.reduce((sum, curr) => sum + curr, 0);
      const avgDuration = totalDuration / durations.length;
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);

      const result: ProfileResult = {
        operation: config.operation,
        duration: totalDuration,
        memoryBefore,
        memoryAfter,
        memoryDelta: memoryAfter - memoryBefore,
        iterations: config.iterations,
        avgDuration,
        minDuration,
        maxDuration,
        lastDuration: durations[durations.length - 1],
        timestamp: Date.now()
      };

      this.profileResults.push(result);

      logWithContext.info(`Profiling completed for operation: ${config.operation}`, {
        operation: config.operation,
        totalDuration: result.duration,
        avgDuration: result.avgDuration,
        minDuration: result.minDuration,
        maxDuration: result.maxDuration,
        memoryDelta: result.memoryDelta
      });

      return result;
    } finally {
      this.isProfiling = false;
    }
  }

  /**
   * Execute a specific native module operation
   */
  private async executeOperation(operation: string, testData: any, parameters?: Record<string, any>): Promise<any> {
    // This would call the actual native module operation
    // For now, we'll simulate with a timeout to represent processing time
    // In a real implementation, this would call the native module directly

    // Simulate different operations with different processing times
    switch (operation) {
      case 'atomize':
        // Simulate atomization processing
        await new Promise(resolve => setTimeout(resolve, Math.min(10, testData.length / 100)));
        return { atoms: testData.split(/\s+/).length };
      case 'fingerprint':
        // Simulate fingerprinting processing
        await new Promise(resolve => setTimeout(resolve, Math.min(5, testData.length / 200)));
        return { fingerprint: testData.length.toString(16) };
      case 'sanitize':
        // Simulate sanitization processing
        await new Promise(resolve => setTimeout(resolve, Math.min(8, testData.length / 150)));
        return { sanitized: testData.replace(/[{}[\]""]/g, '') };
      case 'distance':
        // Simulate distance calculation
        await new Promise(resolve => setTimeout(resolve, 2));
        return { distance: Math.random() * 100 };
      default:
        // For unknown operations, just return after a small delay
        await new Promise(resolve => setTimeout(resolve, 1));
        return { result: 'processed' };
    }
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): number {
    const memoryUsage = process.memoryUsage();
    // Use heapUsed for the primary measurement
    return Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100;
  }

  /**
   * Profile multiple operations
   */
  async profileMultiple(configs: ProfilingConfig[]): Promise<ProfileResult[]> {
    const results: ProfileResult[] = [];

    for (const config of configs) {
      try {
        const result = await this.profileOperation(config);
        results.push(result);
      } catch (error) {
        logWithContext.error(`Error profiling operation ${config.operation}`, error as Error);
        // Continue with other operations
      }
    }

    return results;
  }

  /**
   * Get all profile results
   */
  getProfileResults(): ProfileResult[] {
    return [...this.profileResults];
  }

  /**
   * Clear profile results
   */
  clearResults(): void {
    this.profileResults = [];
  }

  /**
   * Generate profiling report
   */
  generateReport(): string {
    if (this.profileResults.length === 0) {
      return 'No profiling results available.';
    }

    let report = '=== Native Module Profiling Report ===\n\n';
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Total Operations Profiled: ${this.profileResults.length}\n\n`;

    for (const result of this.profileResults) {
      report += `Operation: ${result.operation}\n`;
      report += `  Total Duration: ${result.duration.toFixed(2)} ms\n`;
      report += `  Avg Duration: ${result.avgDuration.toFixed(2)} ms\n`;
      report += `  Min Duration: ${result.minDuration.toFixed(2)} ms\n`;
      report += `  Max Duration: ${result.maxDuration.toFixed(2)} ms\n`;
      report += `  Memory Delta: ${result.memoryDelta.toFixed(2)} MB\n`;
      report += `  Iterations: ${result.iterations}\n`;
      report += `  Timestamp: ${new Date(result.timestamp).toISOString()}\n\n`;
    }

    return report;
  }

  /**
   * Get slowest operations
   */
  getSlowestOperations(limit: number = 5): ProfileResult[] {
    return [...this.profileResults]
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  /**
   * Get highest memory impact operations
   */
  getHighestMemoryImpact(limit: number = 5): ProfileResult[] {
    return [...this.profileResults]
      .sort((a, b) => Math.abs(b.memoryDelta) - Math.abs(a.memoryDelta))
      .slice(0, limit);
  }
}

// Export singleton instance
export const nativeModuleProfiler = new NativeModuleProfiler();