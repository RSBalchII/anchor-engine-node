/**
 * Monitoring API Service for ECE_Core Frontend
 * 
 * Provides API access to monitoring endpoints
 */

interface SystemMetrics {
  timestamp: number;
  uptime: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    message?: string;
    details?: any;
  }>;
  system: {
    platform: string;
    arch: string;
    totalMemory: number;
    freeMemory: number;
    cpuCount: number;
    loadAverage: number[];
    diskSpace: {
      total: number;
      available: number;
      used: number;
    };
    processInfo: {
      pid: number;
      memoryUsage: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
        arrayBuffers: number;
      };
      uptime: number;
    };
  };
}

interface PerformanceMetrics {
  operation: string;
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  lastDuration: number;
  activeOperations: number;
}

interface MonitoringResponse {
  metrics: PerformanceMetrics[];
  system: SystemMetrics;
  timestamp: number;
}

export const monitoringApi = {
  /**
   * Get system health metrics
   */
  getSystemHealth: (): Promise<SystemMetrics> => {
    return fetch('/health')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      });
  },

  /**
   * Get performance metrics
   */
  getPerformanceMetrics: (): Promise<PerformanceMetrics[]> => {
    return fetch('/monitoring/metrics')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json().then(data => {
          // Transform the response to match expected format
          if (data.metrics) {
            return Object.entries(data.metrics).map(([operation, metricData]: [string, any]) => ({
              operation,
              count: metricData.count || 0,
              totalDuration: metricData.totalDuration || 0,
              averageDuration: metricData.averageDuration || metricData.average || 0,
              minDuration: metricData.minDuration || 0,
              maxDuration: metricData.maxDuration || 0,
              lastDuration: metricData.lastDuration || 0,
              activeOperations: metricData.activeOperations || 0
            }));
          } else if (Array.isArray(data)) {
            return data;
          }
          return [];
        });
      });
  },

  /**
   * Get comprehensive monitoring data
   */
  getMonitoringData: (): Promise<MonitoringResponse> => {
    return Promise.all([
      fetch('/health').then(r => r.json()),
      fetch('/monitoring/metrics').then(r => r.json())
    ]).then(([healthData, metricsData]) => ({
      system: healthData,
      metrics: metricsData.metrics || [],
      timestamp: Date.now()
    }));
  },

  /**
   * Get database health
   */
  getDatabaseHealth: (): Promise<any> => {
    return fetch('/health/database')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      });
  },

  /**
   * Get native module health
   */
  getNativeModuleHealth: (): Promise<any> => {
    return fetch('/health/native')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      });
  },

  /**
   * Get system resources
   */
  getSystemResources: (): Promise<any> => {
    return fetch('/monitoring/resources')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      });
  },

} as const;

// Define the type for the monitoringApi object
export type MonitoringApiType = typeof monitoringApi;