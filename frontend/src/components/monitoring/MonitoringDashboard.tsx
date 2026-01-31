/**
 * Monitoring Dashboard for ECE_Core
 * 
 * Real-time system monitoring dashboard with performance metrics
 */

import React, { useState, useEffect } from 'react';
import { monitoringApi } from '../../services/monitoring-api';

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
  metrics?: any;
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

const MonitoringDashboard: React.FC = () => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'system' | 'performance' | 'health'>('system');
  const [refreshInterval, setRefreshInterval] = useState<any | null>(null);

  // Fetch metrics from the monitoring endpoints
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const [healthResponse, metricsResponse] = await Promise.all([
        monitoringApi.getSystemHealth(),
        monitoringApi.getPerformanceMetrics()
      ]);

      setSystemMetrics(healthResponse);

      setPerformanceMetrics(metricsResponse);

      setError(null);
    } catch (err: any) {
      setError(`Failed to fetch metrics: ${err.message}`);
      console.error('Monitoring dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize and set up refresh interval
  useEffect(() => {
    fetchMetrics();

    // Set up auto-refresh every 5 seconds
    const interval = setInterval(fetchMetrics, 5000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchMetrics();
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format uptime to human-readable format
  const formatUptime = (uptime: number): string => {
    const seconds = Math.floor(uptime);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Get status color based on status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
        return 'text-green-400';
      case 'degraded':
        return 'text-yellow-400';
      case 'unhealthy':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  // Render system metrics tab
  const renderSystemMetrics = () => {
    if (!systemMetrics) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* System Overview Card */}
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">System Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={`font-medium ${getStatusColor(systemMetrics.status)}`}>
                {systemMetrics.status.charAt(0).toUpperCase() + systemMetrics.status.slice(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Platform:</span>
              <span className="text-gray-200">{systemMetrics.system.platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Architecture:</span>
              <span className="text-gray-200">{systemMetrics.system.arch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Uptime:</span>
              <span className="text-gray-200">{formatUptime(systemMetrics.uptime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Process ID:</span>
              <span className="text-gray-200">{systemMetrics.system.processInfo.pid}</span>
            </div>
          </div>
        </div>

        {/* Memory Usage Card */}
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Memory Usage</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Memory:</span>
              <span className="text-gray-200">{formatBytes(systemMetrics.system.totalMemory)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Used Memory:</span>
              <span className="text-gray-200">{formatBytes(systemMetrics.system.totalMemory - systemMetrics.system.freeMemory)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Free Memory:</span>
              <span className="text-gray-200">{formatBytes(systemMetrics.system.freeMemory)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Heap Used:</span>
              <span className="text-gray-200">{formatBytes(systemMetrics.system.processInfo.memoryUsage.heapUsed)}</span>
            </div>
          </div>
        </div>

        {/* CPU & Load Card */}
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">CPU & Load</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">CPU Cores:</span>
              <span className="text-gray-200">{systemMetrics.system.cpuCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Load Average (1m):</span>
              <span className="text-gray-200">{systemMetrics.system.loadAverage[0]?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Load Average (5m):</span>
              <span className="text-gray-200">{systemMetrics.system.loadAverage[1]?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Load Average (15m):</span>
              <span className="text-gray-200">{systemMetrics.system.loadAverage[2]?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Disk Space Card */}
        <div className="glass-panel p-6 rounded-xl md:col-span-2 lg:col-span-3">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Disk Space</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Disk Space:</span>
              <span className="text-gray-200">{formatBytes(systemMetrics.system.diskSpace.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Used Disk Space:</span>
              <span className="text-gray-200">{formatBytes(systemMetrics.system.diskSpace.used)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Available Disk Space:</span>
              <span className="text-gray-200">{formatBytes(systemMetrics.system.diskSpace.available)}</span>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Disk Usage</span>
                <span className="text-gray-200">
                  {((systemMetrics.system.diskSpace.used / systemMetrics.system.diskSpace.total) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-blue-500 h-2.5 rounded-full" 
                  style={{ 
                    width: `${(systemMetrics.system.diskSpace.used / systemMetrics.system.diskSpace.total) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Component Health Card */}
        <div className="glass-panel p-6 rounded-xl md:col-span-2 lg:col-span-3">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Component Health</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {systemMetrics.components.map((component, index) => (
              <div key={index} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">{component.name}</span>
                  <span className={`text-sm font-medium ${getStatusColor(component.status)}`}>
                    {component.status}
                  </span>
                </div>
                {component.message && (
                  <div className="mt-1 text-xs text-gray-400 truncate">{component.message}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render performance metrics tab
  const renderPerformanceMetrics = () => {
    return (
      <div className="space-y-6">
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Performance Operations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3">Operation</th>
                  <th className="px-4 py-3">Count</th>
                  <th className="px-4 py-3">Avg Duration (ms)</th>
                  <th className="px-4 py-3">Min (ms)</th>
                  <th className="px-4 py-3">Max (ms)</th>
                  <th className="px-4 py-3">Last (ms)</th>
                  <th className="px-4 py-3">Active</th>
                </tr>
              </thead>
              <tbody>
                {performanceMetrics.map((metric, index) => (
                  <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-gray-200">{metric.operation}</td>
                    <td className="px-4 py-3">{metric.count}</td>
                    <td className="px-4 py-3">
                      <span className={metric.averageDuration > 100 ? 'text-red-400' : metric.averageDuration > 50 ? 'text-yellow-400' : 'text-green-400'}>
                        {metric.averageDuration.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{metric.minDuration.toFixed(2)}</td>
                    <td className="px-4 py-3">{metric.maxDuration.toFixed(2)}</td>
                    <td className="px-4 py-3">{metric.lastDuration.toFixed(2)}</td>
                    <td className="px-4 py-3">{metric.activeOperations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-xl">
            <h4 className="text-md font-semibold mb-2 text-gray-200">Total Operations</h4>
            <p className="text-3xl font-bold text-blue-400">
              {performanceMetrics.reduce((sum, metric) => sum + metric.count, 0)}
            </p>
          </div>
          <div className="glass-panel p-6 rounded-xl">
            <h4 className="text-md font-semibold mb-2 text-gray-200">Avg Duration</h4>
            <p className="text-3xl font-bold text-green-400">
              {performanceMetrics.length > 0 
                ? (performanceMetrics.reduce((sum, metric) => sum + metric.averageDuration, 0) / performanceMetrics.length).toFixed(2) 
                : '0.00'} ms
            </p>
          </div>
          <div className="glass-panel p-6 rounded-xl">
            <h4 className="text-md font-semibold mb-2 text-gray-200">Active Operations</h4>
            <p className="text-3xl font-bold text-purple-400">
              {performanceMetrics.reduce((sum, metric) => sum + metric.activeOperations, 0)}
            </p>
          </div>
        </div>

        {/* Slowest Operations */}
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Slowest Operations</h3>
          <div className="space-y-3">
            {[...performanceMetrics]
              .sort((a, b) => b.maxDuration - a.maxDuration)
              .slice(0, 5)
              .map((metric, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-200">{metric.operation}</div>
                    <div className="text-sm text-gray-400">Max: {metric.maxDuration.toFixed(2)}ms</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-300">Avg: {metric.averageDuration.toFixed(2)}ms</div>
                    <div className="text-xs text-gray-500">Count: {metric.count}</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    );
  };

  // Render health metrics tab
  const renderHealthMetrics = () => {
    if (!systemMetrics) return null;

    return (
      <div className="space-y-6">
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Health Status</h3>
          <div className="flex items-center space-x-4">
            <div className={`w-4 h-4 rounded-full ${systemMetrics.status === 'healthy' ? 'bg-green-500' : systemMetrics.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
            <span className="text-xl font-medium capitalize">
              {systemMetrics.status} 
              <span className="text-sm font-normal ml-2 text-gray-400">({new Date(systemMetrics.timestamp).toLocaleString()})</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Database Health */}
          <div className="glass-panel p-6 rounded-xl">
            <h4 className="text-md font-semibold mb-3 text-gray-200">Database Health</h4>
            <button
              className="w-full p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700 transition-colors"
              onClick={async () => {
                try {
                  const response = await monitoringApi.getDatabaseHealth();
                  alert(`Database Health: ${response.status}\nDetails: ${JSON.stringify(response.details, null, 2)}`);
                } catch (err: any) {
                  alert(`Database health check failed: ${err.message}`);
                }
              }}
            >
              <div className="flex items-center justify-center space-x-2">
                <span>🔍</span>
                <span>Check Database Health</span>
              </div>
            </button>
          </div>

          {/* Native Module Health */}
          <div className="glass-panel p-6 rounded-xl">
            <h4 className="text-md font-semibold mb-3 text-gray-200">Native Modules</h4>
            <button 
              className="w-full p-4 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700 transition-colors"
              onClick={async () => {
                try {
                  const response = await monitoringApi.getNativeModuleHealth();
                  alert(`Native Modules: ${response.status}\nDetails: ${JSON.stringify(response.details, null, 2)}`);
                } catch (err: any) {
                  alert(`Native module health check failed: ${err.message}`);
                }
              }}
            >
              <div className="flex items-center justify-center space-x-2">
                <span>⚙️</span>
                <span>Check Native Modules</span>
              </div>
            </button>
          </div>
        </div>

        {/* Detailed Component Status */}
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Detailed Component Status</h3>
          <div className="space-y-4">
            {systemMetrics.components.map((component, index) => (
              <div key={index} className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-200">{component.name}</h4>
                    {component.message && (
                      <p className="text-sm text-gray-400 mt-1">{component.message}</p>
                    )}
                    {component.details && (
                      <pre className="text-xs text-gray-500 mt-2 bg-gray-900/50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(component.details, null, 2)}
                      </pre>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(component.status)} bg-opacity-20`}>
                    {component.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-100">System Monitoring Dashboard</h2>
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <select
            value={refreshInterval ? 5 : 0}
            onChange={(e) => {
              if (refreshInterval) clearInterval(refreshInterval);
              
              if (parseInt(e.target.value) > 0) {
                const newInterval = setInterval(fetchMetrics, parseInt(e.target.value) * 1000);
                setRefreshInterval(newInterval);
              } else {
                setRefreshInterval(null);
              }
            }}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
          >
            <option value={0}>Manual</option>
            <option value={5}>5s</option>
            <option value={10}>10s</option>
            <option value={30}>30s</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-6">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'system' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
          onClick={() => setActiveTab('system')}
        >
          System Metrics
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'performance' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'health' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
          onClick={() => setActiveTab('health')}
        >
          Health Checks
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="glass-panel p-6 rounded-xl text-center">
          <div className="text-red-400 mb-2">⚠️ Error</div>
          <div className="text-gray-300">{error}</div>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto">
          {activeTab === 'system' && renderSystemMetrics()}
          {activeTab === 'performance' && renderPerformanceMetrics()}
          {activeTab === 'health' && renderHealthMetrics()}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Monitoring data refreshed automatically every 5 seconds
      </div>
    </div>
  );
};

export default MonitoringDashboard;