/**
 * Performance Regression Tests for ECE_Core
 * 
 * Tests to detect performance degradation between releases
 */

import { TestFramework, TestConfig } from './core.js';
import { performanceMonitor } from '../utils/performance-monitor.js';
import axios from 'axios';

// Performance baselines from previous releases
const BASELINE_PERFORMANCE = {
  ingestionRate: 50, // atoms per second
  searchLatency: 200, // milliseconds
  memoryUsage: 500, // MB
  startupTime: 10000 // milliseconds
};

// Performance test configurations
const PERFORMANCE_TESTS: TestConfig[] = [
  {
    name: 'Ingestion Performance Regression',
    description: 'Test ingestion performance against baseline',
    testFn: async () => {
      const endTiming = performanceMonitor.startOperation('ingestion_performance_test');
      
      try {
        // Create test content
        const testContent = Array.from({ length: 50 }, (_, i) => 
          `Performance test content block ${i}. This is test content to measure ingestion performance. The quick brown fox jumps over the lazy dog. ${Math.random().toString(36).substring(2, 15)}`
        ).join('\n\n');
        
        const startTime = Date.now();
        
        // Perform ingestion
        const response = await axios.post('http://localhost:3000/v1/ingest', {
          content: testContent,
          source: 'performance-regression-test',
          type: 'test',
          buckets: ['performance']
        });
        
        if (response.status !== 200) {
          throw new Error(`Ingestion failed with status: ${response.status}`);
        }
        
        const duration = Date.now() - startTime;
        const atomCount = 50; // Number of content blocks
        const ingestionRate = atomCount / (duration / 1000); // atoms per second
        
        console.log(`✅ Ingestion: ${atomCount} atoms in ${duration}ms (${ingestionRate.toFixed(2)} atoms/sec)`);
        
        // Compare with baseline
        if (ingestionRate < BASELINE_PERFORMANCE.ingestionRate * 0.8) {
          console.warn(`⚠️  Ingestion performance degradation detected: ${ingestionRate.toFixed(2)} vs baseline ${BASELINE_PERFORMANCE.ingestionRate}`);
        } else if (ingestionRate > BASELINE_PERFORMANCE.ingestionRate * 1.1) {
          console.log(`📈 Ingestion performance improvement: ${ingestionRate.toFixed(2)} vs baseline ${BASELINE_PERFORMANCE.ingestionRate}`);
        }
        
        // Record performance metric
        performanceMonitor.recordMetric('ingestion_rate', ingestionRate);
      } finally {
        endTiming();
      }
    },
    timeout: 60000
  },
  {
    name: 'Search Latency Regression',
    description: 'Test search latency against baseline',
    testFn: async () => {
      const endTiming = performanceMonitor.startOperation('search_latency_test');
      
      try {
        // Wait for ingestion to be processed
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const queries = [
          'performance test content',
          'quick brown fox',
          'test content block',
          Math.random().toString(36).substring(2, 10)
        ];
        
        let totalLatency = 0;
        let maxLatency = 0;
        
        for (const query of queries) {
          const startTime = Date.now();
          
          const response = await axios.post('http://localhost:3000/v1/memory/search', {
            query,
            buckets: ['performance']
          });
          
          if (response.status !== 200) {
            throw new Error(`Search failed with status: ${response.status}`);
          }
          
          const duration = Date.now() - startTime;
          totalLatency += duration;
          maxLatency = Math.max(maxLatency, duration);
          
          console.log(`   Query "${query}": ${duration}ms`);
        }
        
        const avgLatency = totalLatency / queries.length;
        
        console.log(`✅ Search: ${queries.length} queries, avg ${avgLatency.toFixed(2)}ms, max ${maxLatency}ms`);
        
        // Compare with baseline
        if (avgLatency > BASELINE_PERFORMANCE.searchLatency * 1.2) {
          console.warn(`⚠️  Search latency regression detected: ${avgLatency.toFixed(2)}ms vs baseline ${BASELINE_PERFORMANCE.searchLatency}ms`);
        } else if (avgLatency < BASELINE_PERFORMANCE.searchLatency * 0.8) {
          console.log(`📈 Search performance improvement: ${avgLatency.toFixed(2)}ms vs baseline ${BASELINE_PERFORMANCE.searchLatency}ms`);
        }
        
        // Record performance metric
        performanceMonitor.recordMetric('search_avg_latency', avgLatency);
        performanceMonitor.recordMetric('search_max_latency', maxLatency);
      } finally {
        endTiming();
      }
    },
    timeout: 45000
  },
  {
    name: 'Memory Usage Regression',
    description: 'Test memory usage against baseline',
    testFn: async () => {
      const endTiming = performanceMonitor.startOperation('memory_usage_test');
      
      try {
        // Get initial memory usage
        const initialMemory = process.memoryUsage();
        const initialRSS = initialMemory.rss / 1024 / 1024; // Convert to MB
        
        console.log(`📊 Initial memory usage: ${initialRSS.toFixed(2)}MB`);
        
        // Perform some operations that might affect memory
        for (let i = 0; i < 10; i++) {
          await axios.post('http://localhost:3000/v1/memory/search', {
            query: `test query ${i}`,
            buckets: ['performance']
          });
        }
        
        // Wait for garbage collection
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get final memory usage
        const finalMemory = process.memoryUsage();
        const finalRSS = finalMemory.rss / 1024 / 1024; // Convert to MB
        const memoryDelta = finalRSS - initialRSS;
        
        console.log(`📊 Final memory usage: ${finalRSS.toFixed(2)}MB (delta: ${memoryDelta.toFixed(2)}MB)`);
        
        // Compare with baseline
        if (memoryDelta > BASELINE_PERFORMANCE.memoryUsage) {
          console.warn(`⚠️  Memory usage regression detected: ${memoryDelta.toFixed(2)}MB vs baseline ${BASELINE_PERFORMANCE.memoryUsage}MB`);
        } else {
          console.log(`✅ Memory usage within baseline: ${memoryDelta.toFixed(2)}MB vs ${BASELINE_PERFORMANCE.memoryUsage}MB`);
        }
        
        // Record performance metric
        performanceMonitor.recordMetric('memory_delta', memoryDelta);
      } finally {
        endTiming();
      }
    },
    timeout: 30000
  },
  {
    name: 'Concurrent Request Performance',
    description: 'Test performance under concurrent load',
    testFn: async () => {
      const endTiming = performanceMonitor.startOperation('concurrent_request_test');
      
      try {
        // Send multiple requests in parallel
        const requests = Array.from({ length: 5 }, (_, i) => 
          axios.post('http://localhost:3000/v1/memory/search', {
            query: `concurrent test ${i}`,
            buckets: ['performance']
          })
        );
        
        const start = Date.now();
        const responses = await Promise.all(requests.map(req => req.catch(e => e)));
        const duration = Date.now() - start;
        
        const successfulRequests = responses.filter(r => !(r instanceof Error));
        const failedRequests = responses.filter(r => r instanceof Error);
        
        console.log(`✅ Concurrent requests: ${successfulRequests.length}/${requests.length} succeeded in ${duration}ms`);
        
        if (successfulRequests.length < requests.length) {
          console.warn(`⚠️  ${failedRequests.length} concurrent requests failed`);
        }
        
        // Calculate average response time per request
        const avgResponseTime = duration / requests.length;
        console.log(`📊 Average concurrent response time: ${avgResponseTime.toFixed(2)}ms`);
        
        // Record performance metric
        performanceMonitor.recordMetric('concurrent_avg_response', avgResponseTime);
        performanceMonitor.recordMetric('concurrent_throughput', requests.length / (duration / 1000));
      } finally {
        endTiming();
      }
    },
    timeout: 60000
  },
  {
    name: 'Large Payload Handling',
    description: 'Test performance with large data payloads',
    testFn: async () => {
      const endTiming = performanceMonitor.startOperation('large_payload_test');
      
      try {
        // Create a large content payload
        const largeContent = Array.from({ length: 200 }, (_, i) => 
          `Large payload test block ${i}. This is a moderately long sentence to increase the content size. The performance of the system when handling large payloads is critical for real-world usage. ${Math.random().toString(36).substring(2, 15)}. `.repeat(10)
        ).join('\n\n');
        
        console.log(`📊 Testing with large payload (${(largeContent.length / 1024).toFixed(2)}KB)`);
        
        const startTime = Date.now();
        const response = await axios.post('http://localhost:3000/v1/ingest', {
          content: largeContent,
          source: 'large-payload-test',
          type: 'test',
          buckets: ['performance', 'large-payload']
        });
        
        if (response.status !== 200) {
          throw new Error(`Large payload ingestion failed with status: ${response.status}`);
        }
        
        const duration = Date.now() - startTime;
        
        console.log(`✅ Large payload ingestion: ${(largeContent.length / 1024).toFixed(2)}KB in ${duration}ms`);
        
        // Record performance metric
        performanceMonitor.recordMetric('large_payload_ingestion_time', duration);
        performanceMonitor.recordMetric('large_payload_size_kb', largeContent.length / 1024);
      } finally {
        endTiming();
      }
    },
    timeout: 120000 // 2 minutes for large payload
  },
  {
    name: 'Database Query Performance',
    description: 'Test database query performance',
    testFn: async () => {
      const endTiming = performanceMonitor.startOperation('database_query_test');
      
      try {
        // Perform multiple search queries to test database performance
        const queries = [
          { query: 'performance', buckets: ['performance'] },
          { query: 'test', buckets: ['performance'] },
          { query: 'content', buckets: ['performance'] },
          { query: 'block', buckets: ['performance'] }
        ];
        
        let totalQueryTime = 0;
        
        for (const q of queries) {
          const start = Date.now();
          
          const response = await axios.post('http://localhost:3000/v1/memory/search', q);
          
          if (response.status !== 200) {
            throw new Error(`Database query failed with status: ${response.status}`);
          }
          
          const duration = Date.now() - start;
          totalQueryTime += duration;
          
          console.log(`   Query "${q.query}": ${duration}ms`);
        }
        
        const avgQueryTime = totalQueryTime / queries.length;
        
        console.log(`✅ Database queries: ${queries.length} queries, avg ${avgQueryTime.toFixed(2)}ms`);
        
        // Record performance metric
        performanceMonitor.recordMetric('db_avg_query_time', avgQueryTime);
      } finally {
        endTiming();
      }
    },
    timeout: 40000
  }
];

// Performance regression test runner
export class PerformanceRegressionTester {
  private framework: TestFramework;
  private performanceMonitor = performanceMonitor; // Use the imported singleton

  constructor(framework: TestFramework) {
    this.framework = framework;
  }

  /**
   * Run all performance regression tests
   */
  async runAllPerformanceRegressionTests(): Promise<void> {
    console.log('\n⏱️  Running Performance Regression Tests...\n');
    
    // Create a test suite for performance regression tests
    const performanceSuite = {
      name: 'Performance Regression Tests',
      description: 'Tests to detect performance degradation between releases',
      tests: PERFORMANCE_TESTS,
      timeout: 120000, // 2 minutes for the whole suite
      environment: 'performance',
      tags: ['performance', 'regression', 'baseline']
    };
    
    // Add the suite to the framework and run it
    this.framework.addTestSuite(performanceSuite);
    await this.framework.runTestSuite(performanceSuite);
  }

  /**
   * Run specific performance regression tests by tag
   */
  async runPerformanceTestsByTag(tag: string): Promise<void> {
    const taggedTests = PERFORMANCE_TESTS.filter(test => test.tags?.includes(tag));
    
    if (taggedTests.length === 0) {
      console.log(`No performance tests found with tag: ${tag}`);
      return;
    }
    
    const performanceSuite = {
      name: `Performance Regression Tests (${tag})`,
      description: `Performance regression tests tagged with: ${tag}`,
      tests: taggedTests,
      timeout: 120000,
      environment: 'performance',
      tags: ['performance', 'regression', tag]
    };
    
    this.framework.addTestSuite(performanceSuite);
    await this.framework.runTestSuite(performanceSuite);
  }

  /**
   * Compare current performance with baseline
   */
  async compareWithBaseline(): Promise<{
    passed: boolean;
    regressions: string[];
    improvements: string[];
    summary: string;
  }> {
    // This would typically compare current test results with stored baseline results
    // For now, we'll return a mock comparison based on the test implementations
    
    const results = await this.runAllPerformanceRegressionTests();
    
    // Mock comparison logic
    const regressions: string[] = [];
    const improvements: string[] = [];
    
    // In a real implementation, we would compare actual metrics with stored baselines
    // For now, we'll just return a positive result
    regressions.push('No regressions detected in mock comparison');
    
    const summary = `Performance comparison completed. Regressions: ${regressions.length}, Improvements: ${improvements.length}`;
    
    return {
      passed: regressions.length === 0,
      regressions,
      improvements,
      summary
    };
  }
}

// Export a function to run performance regression tests
export async function runPerformanceRegressionTests(): Promise<void> {
  const framework = new TestFramework({ verbose: true });
  const performanceTester = new PerformanceRegressionTester(framework);
  
  await performanceTester.runAllPerformanceRegressionTests();
}

// If this module is run directly, execute the performance regression tests
if (require.main === module) {
  runPerformanceRegressionTests()
    .then(() => {
      console.log('\n✅ Performance regression tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Performance regression tests failed:', error);
      process.exit(1);
    });
}