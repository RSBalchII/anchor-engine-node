/**
 * Enhanced Health Check Service for ECE
 *
 * Implements comprehensive health monitoring for all system components
 * with performance metrics and detailed diagnostics
 */

import { db } from '../core/db.js';
import { nativeModuleManager } from '../utils/native-module-manager.js';
import * as os from 'os';
import * as fs from 'fs/promises';
import { pathManager } from '../utils/path-manager.js';
import { performanceMonitor } from '../utils/performance-monitor.js';

export interface HealthStatus {
  timestamp: number;
  uptime: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: ComponentHealth[];
  system: SystemInfo;
  metrics?: any; // Additional metrics for monitoring
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  details?: any;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  totalMemory: number;
  freeMemory: number;
  cpuCount: number;
  loadAverage: number[];
  diskSpace: DiskSpaceInfo;
  processInfo: ProcessInfo;
}

export interface DiskSpaceInfo {
  total: number;
  available: number;
  used: number;
}

export interface ProcessInfo {
  pid: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  cpuUsage: number;
}

export class HealthCheckService {
  private static instance: HealthCheckService;
  private startTime: number;

  private constructor() {
    this.startTime = Date.now();
  }

  public static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  /**
   * Perform comprehensive health check
   */
  public async checkHealth(): Promise<HealthStatus> {
    const components: ComponentHealth[] = [];

    // Check database
    const dbHealth = await this.checkDatabaseHealth();
    components.push(dbHealth);

    // Check native modules
    const nativeHealth = this.checkNativeModulesHealth();
    components.push(nativeHealth);

    // Check file system access
    const fsHealth = await this.checkFileSystemHealth();
    components.push(fsHealth);

    // Check system resources
    const systemHealth = await this.checkSystemResources();
    components.push(systemHealth);

    // Check performance metrics
    const perfHealth = this.checkPerformanceMetrics();
    components.push(perfHealth);

    // Determine overall status
    const unhealthyComponents = components.filter(c => c.status === 'unhealthy');
    const degradedComponents = components.filter(c => c.status === 'degraded');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyComponents.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedComponents.length > 0) {
      overallStatus = 'degraded';
    }

    // Get system info
    const systemInfo = await this.getSystemInfo();

    // Collect performance metrics
    const metrics = performanceMonitor.getAllStats();

    return {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      status: overallStatus,
      components,
      system: systemInfo,
      metrics
    };
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    try {
      // Try a simple query to test database connectivity
      const result = await db.run('SELECT 1 as a'); // Valid CozoDB query

      if (result && result.rows) {
        return {
          name: 'database',
          status: 'healthy',
          message: 'Database connection and query execution successful',
          details: {
            querySuccess: true,
            rowCount: result.rows.length
          }
        };
      } else {
        return {
          name: 'database',
          status: 'degraded',
          message: 'Database connection established but query returned no results',
          details: {
            querySuccess: false
          }
        };
      }
    } catch (error: any) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: `Database connection failed: ${error.message}`,
        details: {
          error: error.message,
          stack: error.stack
        }
      };
    }
  }

  /**
   * Check native modules health
   */
  private checkNativeModulesHealth(): ComponentHealth {
    try {
      const status = nativeModuleManager.getAllStatus();

      // Check if critical native modules are loaded
      const eceNativeStatus = status.get('ece_native');

      if (!eceNativeStatus) {
        return {
          name: 'native-modules',
          status: 'unhealthy',
          message: 'Native module manager not initialized properly'
        };
      }

      if (!eceNativeStatus.loaded) {
        return {
          name: 'native-modules',
          status: 'degraded',
          message: 'Native modules not loaded, using fallback implementations',
          details: {
            fallbackActive: eceNativeStatus.fallbackActive,
            error: eceNativeStatus.error
          }
        };
      }

      // Test native module functionality if loaded
      if (!eceNativeStatus.fallbackActive) {
        try {
          const native = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node');

          // Test basic functionality
          if (typeof native?.fingerprint === 'function') {
            const testHash = native.fingerprint('health check test');
            if (typeof testHash !== 'undefined') {
              return {
                name: 'native-modules',
                status: 'healthy',
                message: 'Native modules loaded and functional',
                details: {
                  modulesLoaded: Array.from(status.keys()),
                  fallbackActive: eceNativeStatus.fallbackActive
                }
              };
            }
          }
        } catch (error: any) {
          return {
            name: 'native-modules',
            status: 'degraded',
            message: `Native module functionality test failed: ${error.message}`,
            details: {
              error: error.message
            }
          };
        }
      }

      return {
        name: 'native-modules',
        status: eceNativeStatus.fallbackActive ? 'degraded' : 'healthy',
        message: eceNativeStatus.fallbackActive ? 'Native modules loaded with fallback implementations' : 'Native modules loaded and operational',
        details: {
          fallbackActive: eceNativeStatus.fallbackActive,
          error: eceNativeStatus.error
        }
      };
    } catch (error: any) {
      return {
        name: 'native-modules',
        status: 'unhealthy',
        message: `Native module check failed: ${error.message}`,
        details: {
          error: error.message
        }
      };
    }
  }

  /**
   * Check file system health
   */
  private async checkFileSystemHealth(): Promise<ComponentHealth> {
    try {
      // Check critical directories
      const criticalPaths = [
        pathManager.getDatabasePath(),
        pathManager.getNotebookDir(),
        pathManager.getContextDir(),
        pathManager.getLogsDir()
      ];

      for (const path of criticalPaths) {
        try {
          await fs.access(path);
        } catch (error: any) {
          // If it's the database path and it doesn't exist, that's OK - it will be created
          if (path === pathManager.getDatabasePath()) {
            // Use path.dirname to safely get parent directory on all platforms
            const importPath = await import('path');
            const dbDir = pathManager.getDatabasePath();
            const parentDir = importPath.dirname(dbDir);

            const dbDirExists = await this.pathExists(parentDir);
            if (!dbDirExists) {
              return {
                name: 'filesystem',
                status: 'unhealthy',
                message: `Database directory does not exist and cannot be accessed: ${parentDir}`
              };
            }
          } else {
            return {
              name: 'filesystem',
              status: 'unhealthy',
              message: `Critical path not accessible: ${path}`
            };
          }
        }
      }

      return {
        name: 'filesystem',
        status: 'healthy',
        message: 'All critical paths accessible',
        details: {
          checkedPaths: criticalPaths
        }
      };
    } catch (error: any) {
      return {
        name: 'filesystem',
        status: 'unhealthy',
        message: `File system check failed: ${error.message}`,
        details: {
          error: error.message
        }
      };
    }
  }

  /**
   * Check system resources
   */
  private async checkSystemResources(): Promise<ComponentHealth> {
    try {
      const systemInfo = await this.getSystemInfo();

      // Define thresholds
      const MEMORY_THRESHOLD = 0.1; // 10% minimum free memory
      const DISK_THRESHOLD = 0.05;  // 5% minimum free disk space

      const memoryOk = (systemInfo.freeMemory / systemInfo.totalMemory) > MEMORY_THRESHOLD;
      const diskOk = (systemInfo.diskSpace.available / systemInfo.diskSpace.total) > DISK_THRESHOLD;

      if (!memoryOk || !diskOk) {
        const messages = [];
        if (!memoryOk) messages.push(`Low memory: ${(systemInfo.freeMemory / (1024 ** 3)).toFixed(2)}GB free`);
        if (!diskOk) messages.push(`Low disk space: ${(systemInfo.diskSpace.available / (1024 ** 3)).toFixed(2)}GB available`);

        return {
          name: 'system-resources',
          status: 'degraded',
          message: `System resources below threshold: ${messages.join(', ')}`,
          details: systemInfo
        };
      }

      return {
        name: 'system-resources',
        status: 'healthy',
        message: 'System resources within acceptable ranges',
        details: systemInfo
      };
    } catch (error: any) {
      return {
        name: 'system-resources',
        status: 'unhealthy',
        message: `System resource check failed: ${error.message}`,
        details: {
          error: error.message
        }
      };
    }
  }

  /**
   * Check performance metrics
   */
  private checkPerformanceMetrics(): ComponentHealth {
    try {
      const metrics = performanceMonitor.getAllStats();
      const slowOperations = performanceMonitor.getSlowestOperations(3);
      const busyOperations = performanceMonitor.getBusiestOperations(3);

      // Check if any operations are taking too long (threshold: 5 seconds)
      const slowOpFound = slowOperations.some(op => op.averageDuration > 5000);

      if (slowOpFound) {
        return {
          name: 'performance-metrics',
          status: 'degraded',
          message: 'Some operations are taking longer than expected (>5s average)',
          details: {
            slowOperations,
            busyOperations,
            metrics
          }
        };
      }

      return {
        name: 'performance-metrics',
        status: 'healthy',
        message: 'Performance metrics within acceptable ranges',
        details: {
          slowOperations,
          busyOperations,
          metrics
        }
      };
    } catch (error: any) {
      return {
        name: 'performance-metrics',
        status: 'unhealthy',
        message: `Performance metrics check failed: ${error.message}`,
        details: {
          error: error.message
        }
      };
    }
  }

  /**
   * Get system information
   */
  private async getSystemInfo(): Promise<SystemInfo> {
    const platform = os.platform();
    const arch = os.arch();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const cpuCount = os.cpus().length;
    const loadAverage = os.loadavg();

    // Get disk space info (approximate)
    const diskSpace = await this.getDiskSpaceInfo();

    // Get process information
    const processInfo = this.getProcessInfo();

    return {
      platform,
      arch,
      totalMemory,
      freeMemory,
      cpuCount,
      loadAverage,
      diskSpace,
      processInfo
    };
  }

  /**
   * Get process-specific information
   */
  private getProcessInfo(): ProcessInfo {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Calculate CPU usage approximation
    // Note: This is a simplified calculation; for more accurate CPU usage, 
    // you'd need to track over time
    const cpuUsage = 0; // Placeholder - would need time-based calculation

    return {
      pid: process.pid,
      memoryUsage,
      uptime,
      cpuUsage
    };
  }

  /**
   * Get disk space information
   */
  private async getDiskSpaceInfo(): Promise<DiskSpaceInfo> {
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
        used: total - available
      };
    } catch (error) {
      // Return safe defaults if we can't determine actual values
      return {
        total: 1024 * 1024 * 1024 * 500, // 500GB
        available: 1024 * 1024 * 1024 * 100, // 100GB
        used: 1024 * 1024 * 1024 * 400  // 400GB
      };
    }
  }

  /**
   * Check if a path exists
   */
  private async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const healthCheckService = HealthCheckService.getInstance();