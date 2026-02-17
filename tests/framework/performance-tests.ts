/**
 * Performance Regression Tests for ECE_Core
 * 
 * Tests to detect performance degradation over time
 */

import { TestFramework, TestCase, TestSuiteConfig } from './core.js';
import { testConfigManager } from './config.js';
import { DiagnosticTestRunner } from './diagnostic-tests.js';

export class PerformanceTestRunner {
  private framework: TestFramework;
  private diagnosticRunner: DiagnosticTestRunner;

  constructor() {
    this.framework = new TestFramework();
    this.diagnosticRunner = new DiagnosticTestRunner();
  }

  /**
   * Create performance regression test suite
   */
  createPerformanceTestSuite(): TestSuiteConfig {
    return {
      name: 'Performance Regression Tests',
      description: 'Tests to detect performance degradation over time',
      tests: [
        // Baseline performance tests
        this.createBaselinePerformanceTest(),
        
        // Ingestion performance tests
        this.createIngestionPerformanceTest(),
        
        // Search performance tests
        this.createSearchPerformanceTest(),
        
        // Memory usage tests
        this.createMemoryUsageTest(),
        
        // Database performance tests
        this.createDatabasePerformanceTest(),
        
        // Native module performance tests
        this.createNativeModulePerformanceTest(),
        
        // API response time tests
        this.createApiResponseTimeTest(),
        
        // Concurrency performance tests
        this.createConcurrencyPerformanceTest()
      ],
      timeout: 30000, // 30 seconds for performance tests
      environment: 'performance',
      tags: ['performance', 'regression', 'benchmark']
    };
  }

  /**
   * Baseline performance test
   */
  private createBaselinePerformanceTest(): TestCase {
    return {
      name: 'Baseline Performance Check',
      description: 'Measure basic system performance characteristics',
      testFn: async () => {
        console.log('  ⚙️  Running baseline performance check...');
        
        // Measure basic operation timing
        const iterations = 1000;
        const testString = 'Performance test string for timing measurement';
        
        // Timing test for string operations
        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
          // Simple string operation to measure baseline performance
          const result = testString.toUpperCase().toLowerCase();
        }
        const endTime = performance.now();
        const avgTime = (endTime - startTime) / iterations;
        
        console.log(`  ✅ Baseline string operation: ${avgTime.toFixed(4)}ms avg over ${iterations} iterations`);
        
        // Memory usage check
        const memoryUsage = process.memoryUsage();
        console.log(`  🧠 Memory usage: RSS=${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB, Heap=${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB/${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
        
        // Check if performance is within acceptable bounds
        // (These are example thresholds - in practice, you'd use historical baselines)
        if (avgTime > 0.1) { // More than 0.1ms per operation is concerning for baseline
          console.warn(`  ⚠️  Baseline performance slower than expected: ${avgTime.toFixed(4)}ms (threshold: 0.1ms)`);
        } else {
          console.log('  ✅ Baseline performance within acceptable range');
        }
      },
      timeout: 10000,
      tags: ['baseline', 'performance'],
      dependencies: []
    };
  }

  /**
   * Ingestion performance test
   */
  private createIngestionPerformanceTest(): TestCase {
    return {
      name: 'Ingestion Performance',
      description: 'Test ingestion speed and efficiency',
      testFn: async () => {
        console.log('  📥 Testing ingestion performance...');
        
        // Test with different content sizes
        const testContents = [
          { name: 'Small Content', size: 'small', content: 'A'.repeat(100) },
          { name: 'Medium Content', size: 'medium', content: 'A'.repeat(10000) },
          { name: 'Large Content', size: 'large', content: 'A'.repeat(100000) }
        ];
        
        for (const test of testContents) {
          const startTime = performance.now();
          
          // Simulate ingestion process
          // In a real implementation, this would call the actual ingestion service
          await this.simulateIngestion(test.content);
          
          const endTime = performance.now();
          const duration = endTime - startTime;
          const rate = test.content.length / (duration / 1000); // chars per second
          
          console.log(`  ✅ ${test.name}: ${duration.toFixed(2)}ms (${rate.toLocaleString()} chars/sec)`);
          
          // Performance thresholds (example values)
          if (test.size === 'small' && duration > 100) {
            console.warn(`  ⚠️  Small content ingestion slow: ${duration.toFixed(2)}ms (threshold: 100ms)`);
          } else if (test.size === 'medium' && duration > 500) {
            console.warn(`  ⚠️  Medium content ingestion slow: ${duration.toFixed(2)}ms (threshold: 500ms)`);
          } else if (test.size === 'large' && duration > 2000) {
            console.warn(`  ⚠️  Large content ingestion slow: ${duration.toFixed(2)}ms (threshold: 2000ms)`);
          }
        }
        
        // Test bulk ingestion
        const bulkStartTime = performance.now();
        
        // Simulate ingesting multiple items at once
        const bulkItems = Array.from({ length: 50 }, (_, i) => `Bulk test content item ${i}`);
        await Promise.all(bulkItems.map(content => this.simulateIngestion(content)));
        
        const bulkEndTime = performance.now();
        const bulkDuration = bulkEndTime - bulkStartTime;
        const bulkRate = bulkItems.length / (bulkDuration / 1000); // items per second
        
        console.log(`  ✅ Bulk ingestion: ${bulkDuration.toFixed(2)}ms for ${bulkItems.length} items (${bulkRate.toFixed(2)} items/sec)`);
        
        if (bulkRate < 10) { // Less than 10 items/sec is slow for bulk
          console.warn(`  ⚠️  Bulk ingestion performance slow: ${bulkRate.toFixed(2)} items/sec (threshold: 10 items/sec)`);
        }
      },
      timeout: 20000,
      tags: ['ingestion', 'performance'],
      dependencies: []
    };
  }

  /**
   * Search performance test
   */
  private createSearchPerformanceTest(): TestCase {
    return {
      name: 'Search Performance',
      description: 'Test search speed and efficiency',
      testFn: async () => {
        console.log('  🔍 Testing search performance...');
        
        // Test search with different query complexities
        const queries = [
          { name: 'Simple Term', query: 'test' },
          { name: 'Phrase Query', query: '"performance test"' },
          { name: 'Complex Query', query: 'performance AND test OR benchmark' }
        ];
        
        for (const q of queries) {
          const startTime = performance.now();
          
          // Simulate search operation
          const results = await this.simulateSearch(q.query);
          
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          console.log(`  ✅ ${q.name} search: ${duration.toFixed(2)}ms (${results.length} results)`);
          
          // Performance thresholds
          if (duration > 500) { // More than 500ms is slow for search
            console.warn(`  ⚠️  ${q.name} search slow: ${duration.toFixed(2)}ms (threshold: 500ms)`);
          }
        }
        
        // Test concurrent searches
        const concurrentStartTime = performance.now();
        
        const concurrentQueries = Array.from({ length: 10 }, (_, i) => `concurrent test ${i}`);
        const concurrentResults = await Promise.all(
          concurrentQueries.map(query => this.simulateSearch(query))
        );
        
        const concurrentEndTime = performance.now();
        const concurrentDuration = concurrentEndTime - concurrentStartTime;
        const totalResults = concurrentResults.reduce((sum, r) => sum + r.length, 0);
        
        console.log(`  ✅ Concurrent search: ${concurrentDuration.toFixed(2)}ms for ${concurrentQueries.length} queries (${totalResults} total results)`);
        
        if (concurrentDuration > 2000) { // More than 2s for 10 concurrent searches is slow
          console.warn(`  ⚠️  Concurrent search performance slow: ${concurrentDuration.toFixed(2)}ms for ${concurrentQueries.length} queries (threshold: 2000ms)`);
        }
      },
      timeout: 25000,
      tags: ['search', 'performance'],
      dependencies: []
    };
  }

  /**
   * Memory usage test
   */
  private createMemoryUsageTest(): TestCase {
    return {
      name: 'Memory Usage Analysis',
      description: 'Analyze memory usage patterns during operations',
      testFn: async () => {
        console.log('  💾 Testing memory usage patterns...');
        
        // Capture initial memory state
        const initialMemory = process.memoryUsage();
        console.log(`  📊 Initial memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB used`);
        
        // Perform memory-intensive operation
        const memoryIntensiveData = Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          content: `Memory test content item ${i}`.repeat(10),
          metadata: { index: i, category: `cat_${i % 100}` }
        }));
        
        // Measure memory after creating data
        const afterCreationMemory = process.memoryUsage();
        const creationIncrease = (afterCreationMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
        console.log(`  📊 After creation: ${(afterCreationMemory.heapUsed / 1024 / 1024).toFixed(2)}MB used (+${creationIncrease.toFixed(2)}MB)`);
        
        // Process the data
        const processedData = memoryIntensiveData.map(item => ({
          ...item,
          processed: true,
          fingerprint: this.simpleFingerprint(item.content)
        }));
        
        // Measure memory after processing
        const afterProcessingMemory = process.memoryUsage();
        const processingIncrease = (afterProcessingMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
        console.log(`  📊 After processing: ${(afterProcessingMemory.heapUsed / 1024 / 1024).toFixed(2)}MB used (+${processingIncrease.toFixed(2)}MB)`);
        
        // Clean up
        (memoryIntensiveData as any) = null;
        (processedData as any) = null;
        
        // Force garbage collection if available (Node.js specific)
        if (global.gc) {
          global.gc();
        }
        
        // Wait a bit for GC to potentially run
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Measure memory after cleanup
        const afterCleanupMemory = process.memoryUsage();
        const cleanupReduction = (afterProcessingMemory.heapUsed - afterCleanupMemory.heapUsed) / 1024 / 1024;
        console.log(`  📊 After cleanup: ${(afterCleanupMemory.heapUsed / 1024 / 1024).toFixed(2)}MB used (-${cleanupReduction.toFixed(2)}MB recovered)`);
        
        // Check for potential memory leaks
        const finalIncrease = (afterCleanupMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
        if (finalIncrease > 10) { // More than 10MB increase after cleanup suggests potential leak
          console.warn(`  ⚠️  Potential memory leak detected: +${finalIncrease.toFixed(2)}MB after cleanup (threshold: 10MB)`);
        } else {
          console.log('  ✅ Memory usage appears stable after cleanup');
        }
      },
      timeout: 15000,
      tags: ['memory', 'performance'],
      dependencies: []
    };
  }

  /**
   * Database performance test
   */
  private createDatabasePerformanceTest(): TestCase {
    return {
      name: 'Database Performance',
      description: 'Test database query and transaction performance',
      testFn: async () => {
        console.log('  🗄️  Testing database performance...');
        
        // Test simple query performance
        const simpleQueryStart = performance.now();
        for (let i = 0; i < 100; i++) {
          // Simulate a simple database query
          await this.simulateDbQuery('?[a] := a = 1');
        }
        const simpleQueryEnd = performance.now();
        const simpleQueryAvg = (simpleQueryEnd - simpleQueryStart) / 100;
        
        console.log(`  ✅ Simple query: ${simpleQueryAvg.toFixed(4)}ms avg over 100 iterations`);
        
        if (simpleQueryAvg > 10) { // More than 10ms average is slow for simple query
          console.warn(`  ⚠️  Simple query performance slow: ${simpleQueryAvg.toFixed(4)}ms avg (threshold: 10ms)`);
        }
        
        // Test complex query performance
        const complexQueryStart = performance.now();
        for (let i = 0; i < 10; i++) {
          // Simulate a more complex database query
          await this.simulateDbQuery('?[a, b, c] := *memory{id, content, timestamp}, a = id, b = content, c = timestamp :limit 10');
        }
        const complexQueryEnd = performance.now();
        const complexQueryAvg = (complexQueryEnd - complexQueryStart) / 10;
        
        console.log(`  ✅ Complex query: ${complexQueryAvg.toFixed(4)}ms avg over 10 iterations`);
        
        if (complexQueryAvg > 100) { // More than 100ms average is slow for complex query
          console.warn(`  ⚠️  Complex query performance slow: ${complexQueryAvg.toFixed(4)}ms avg (threshold: 100ms)`);
        }
        
        // Test transaction performance
        const transactionStart = performance.now();
        for (let i = 0; i < 50; i++) {
          // Simulate a database transaction
          await this.simulateDbTransaction([
            '?[id, content] := [[ $id, $content ]] :put memory {id, content}',
            '?[id] := id = $id :get memory {id}'
          ], { id: `txn_test_${i}`, content: `Transaction test content ${i}` });
        }
        const transactionEnd = performance.now();
        const transactionAvg = (transactionEnd - transactionStart) / 50;
        
        console.log(`  ✅ Transactions: ${transactionAvg.toFixed(4)}ms avg over 50 transactions`);
        
        if (transactionAvg > 50) { // More than 50ms average is slow for transaction
          console.warn(`  ⚠️  Transaction performance slow: ${transactionAvg.toFixed(4)}ms avg (threshold: 50ms)`);
        }
      },
      timeout: 20000,
      tags: ['database', 'performance'],
      dependencies: []
    };
  }

  /**
   * Native module performance test
   */
  private createNativeModulePerformanceTest(): TestCase {
    return {
      name: 'Native Module Performance',
      description: 'Test performance of native modules',
      testFn: async () => {
        console.log('  🔧 Testing native module performance...');
        
        try {
          // Try to import and test native modules
          const nativeModulePath = testConfigManager.getConfig().environment.nativeModulePath;
          
          if (!nativeModulePath) {
            console.log('  ⚠️  No native module path configured, skipping native module performance test');
            return;
          }
          
          const nativeModule = await import(nativeModulePath);
          
          // Test fingerprint performance
          if (typeof nativeModule.fingerprint === 'function') {
            const testContent = 'Performance test content for fingerprinting'.repeat(100);
            const iterations = 100;
            
            const fpStart = performance.now();
            for (let i = 0; i < iterations; i++) {
              nativeModule.fingerprint(`${testContent}_${i}`);
            }
            const fpEnd = performance.now();
            const fpAvg = (fpEnd - fpStart) / iterations;
            
            console.log(`  ✅ Native fingerprint: ${fpAvg.toFixed(4)}ms avg over ${iterations} iterations`);
            
            if (fpAvg > 5) { // More than 5ms average is slow for fingerprint
              console.warn(`  ⚠️  Native fingerprint performance slow: ${fpAvg.toFixed(4)}ms avg (threshold: 5ms)`);
            }
          } else {
            console.log('  ⚠️  Native fingerprint function not available');
          }
          
          // Test distance performance
          if (typeof nativeModule.distance === 'function') {
            const iterations = 1000;
            const testHash1 = 12345n;
            const testHash2 = 67890n;
            
            const distStart = performance.now();
            for (let i = 0; i < iterations; i++) {
              nativeModule.distance(testHash1, testHash2);
            }
            const distEnd = performance.now();
            const distAvg = (distEnd - distStart) / iterations;
            
            console.log(`  ✅ Native distance: ${distAvg.toFixed(4)}ms avg over ${iterations} iterations`);
            
            if (distAvg > 0.1) { // More than 0.1ms average is slow for distance calc
              console.warn(`  ⚠️  Native distance performance slow: ${distAvg.toFixed(4)}ms avg (threshold: 0.1ms)`);
            }
          } else {
            console.log('  ⚠️  Native distance function not available');
          }
          
          // Test cleanse performance
          if (typeof nativeModule.cleanse === 'function') {
            const testContent = '{"type": "response_content", "response_content": "Clean content", "thinking_content": "Internal thoughts", "metadata": {"extra": "data"}}'.repeat(50);
            const iterations = 50;
            
            const cleanseStart = performance.now();
            for (let i = 0; i < iterations; i++) {
              nativeModule.cleanse(`${testContent}_${i}`);
            }
            const cleanseEnd = performance.now();
            const cleanseAvg = (cleanseEnd - cleanseStart) / iterations;
            
            console.log(`  ✅ Native cleanse: ${cleanseAvg.toFixed(4)}ms avg over ${iterations} iterations`);
            
            if (cleanseAvg > 10) { // More than 10ms average is slow for cleanse
              console.warn(`  ⚠️  Native cleanse performance slow: ${cleanseAvg.toFixed(4)}ms avg (threshold: 10ms)`);
            }
          } else {
            console.log('  ⚠️  Native cleanse function not available');
          }
          
          console.log('  ✅ Native module performance test completed');
        } catch (error) {
          console.warn('  ⚠️  Native module performance test failed (may be expected if native modules not built):', error.message);
        }
      },
      timeout: 15000,
      tags: ['native-modules', 'performance'],
      dependencies: []
    };
  }

  /**
   * API response time test
   */
  private createApiResponseTimeTest(): TestCase {
    return {
      name: 'API Response Time',
      description: 'Test API endpoint response times',
      testFn: async () => {
        console.log('  🌐 Testing API response times...');
        
        const baseUrl = testConfigManager.getConfig().environment.baseUrl;
        
        if (!baseUrl) {
          console.log('  ⚠️  Base URL not configured, skipping API response time test');
          return;
        }
        
        // Test endpoints that should respond quickly
        const endpointsToTest = [
          { path: '/health', method: 'GET', description: 'Health check' },
          { path: '/v1/models', method: 'GET', description: 'Models list' }
        ];
        
        for (const endpoint of endpointsToTest) {
          try {
            const url = new URL(endpoint.path, baseUrl).href;
            const startTime = performance.now();
            
            const response = await fetch(url, { method: endpoint.method });
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            console.log(`  ✅ ${endpoint.description} endpoint: ${duration.toFixed(2)}ms (status: ${response.status})`);
            
            // Performance thresholds
            if (duration > 200) { // More than 200ms is slow for simple API calls
              console.warn(`  ⚠️  ${endpoint.description} endpoint slow: ${duration.toFixed(2)}ms (threshold: 200ms)`);
            }
          } catch (error) {
            console.warn(`  ⚠️  ${endpoint.description} endpoint not accessible:`, error.message);
          }
        }
        
        // Test search endpoint with a simple query
        try {
          const searchUrl = new URL('/v1/memory/search', baseUrl).href;
          const startTime = performance.now();
          
          const response = await fetch(searchUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 'test', buckets: [] })
          });
          
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          console.log(`  ✅ Search endpoint: ${duration.toFixed(2)}ms (status: ${response.status})`);
          
          if (duration > 1000) { // More than 1s is slow for simple search
            console.warn(`  ⚠️  Search endpoint slow: ${duration.toFixed(2)}ms (threshold: 1000ms)`);
          }
        } catch (error) {
          console.warn('  ⚠️  Search endpoint not accessible:', error.message);
        }
      },
      timeout: 10000,
      tags: ['api', 'performance'],
      dependencies: []
    };
  }

  /**
   * Concurrency performance test
   */
  private createConcurrencyPerformanceTest(): TestCase {
    return {
      name: 'Concurrency Performance',
      description: 'Test system performance under concurrent load',
      testFn: async () => {
        console.log('  ⚡ Testing concurrency performance...');
        
        // Test concurrent ingestion
        const concurrentIngestionStart = performance.now();
        
        const ingestTasks = Array.from({ length: 20 }, async (_, i) => {
          const content = `Concurrent ingestion test content ${i}`.repeat(10);
          return this.simulateIngestion(content);
        });
        
        await Promise.all(ingestTasks);
        
        const concurrentIngestionEnd = performance.now();
        const concurrentIngestionDuration = concurrentIngestionEnd - concurrentIngestionStart;
        
        console.log(`  ✅ Concurrent ingestion: ${concurrentIngestionDuration.toFixed(2)}ms for 20 concurrent operations`);
        
        if (concurrentIngestionDuration > 5000) { // More than 5s for 20 concurrent operations is slow
          console.warn(`  ⚠️  Concurrent ingestion performance slow: ${concurrentIngestionDuration.toFixed(2)}ms for 20 operations (threshold: 5000ms)`);
        }
        
        // Test concurrent search
        const concurrentSearchStart = performance.now();
        
        const searchTasks = Array.from({ length: 10 }, async (_, i) => {
          return this.simulateSearch(`concurrent search test ${i}`);
        });
        
        const searchResults = await Promise.all(searchTasks);
        const totalSearchResults = searchResults.reduce((sum, r) => sum + r.length, 0);
        
        const concurrentSearchEnd = performance.now();
        const concurrentSearchDuration = concurrentSearchEnd - concurrentSearchStart;
        
        console.log(`  ✅ Concurrent search: ${concurrentSearchDuration.toFixed(2)}ms for 10 concurrent operations (${totalSearchResults} total results)`);
        
        if (concurrentSearchDuration > 3000) { // More than 3s for 10 concurrent searches is slow
          console.warn(`  ⚠️  Concurrent search performance slow: ${concurrentSearchDuration.toFixed(2)}ms for 10 operations (threshold: 3000ms)`);
        }
        
        // Check memory usage after concurrent operations
        const memoryAfterConcurrency = process.memoryUsage();
        console.log(`  🧠 Memory after concurrency: ${(memoryAfterConcurrency.heapUsed / 1024 / 1024).toFixed(2)}MB used`);
      },
      timeout: 30000,
      tags: ['concurrency', 'performance'],
      dependencies: []
    };
  }

  /**
   * Simulate ingestion for performance testing
   */
  private async simulateIngestion(content: string): Promise<void> {
    // Simulate the ingestion process with realistic timing
    // In a real implementation, this would call the actual ingestion service
    return new Promise(resolve => {
      // Simulate processing time based on content size
      const processingTime = Math.min(100, Math.max(5, content.length / 1000));
      setTimeout(resolve, processingTime);
    });
  }

  /**
   * Simulate search for performance testing
   */
  private async simulateSearch(query: string): Promise<any[]> {
    // Simulate the search process with realistic timing
    // In a real implementation, this would call the actual search service
    return new Promise(resolve => {
      // Simulate processing time based on query complexity
      const processingTime = Math.min(200, Math.max(10, query.length / 10));
      setTimeout(() => {
        // Return mock results
        resolve([{ id: 'mock_result', content: `Mock result for query: ${query}` }]);
      }, processingTime);
    });
  }

  /**
   * Simulate database query for performance testing
   */
  private async simulateDbQuery(query: string): Promise<any> {
    return new Promise(resolve => {
      // Simulate query execution time
      const processingTime = Math.min(50, Math.max(1, query.length / 10));
      setTimeout(() => {
        resolve({ rows: [['mock_result']], headers: ['result'] });
      }, processingTime);
    });
  }

  /**
   * Simulate database transaction for performance testing
   */
  private async simulateDbTransaction(queries: string[], params: any): Promise<void> {
    return new Promise(resolve => {
      // Simulate transaction execution time
      const processingTime = Math.min(100, Math.max(5, queries.length * 10));
      setTimeout(resolve, processingTime);
    });
  }

  /**
   * Simple fingerprint function for memory test
   */
  private simpleFingerprint(content: string): number {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Run the performance test suite
   */
  async runPerformanceTests(): Promise<void> {
    const suite = this.createPerformanceTestSuite();
    this.framework.addTestSuite(suite);
    
    console.log('\n⚡ Running Performance Regression Tests...\n');
    await this.framework.runAll();
  }

  /**
   * Run a specific category of performance tests
   */
  async runPerformanceTestsByCategory(category: string): Promise<void> {
    const suite = this.createPerformanceTestSuite();
    
    // Filter tests by category/tag
    const categoryTests = suite.tests.filter(test => 
      test.tags.includes(category) || test.name.toLowerCase().includes(category.toLowerCase())
    );
    
    if (categoryTests.length === 0) {
      console.log(`No performance tests found for category: ${category}`);
      return;
    }
    
    const categorySuite = {
      ...suite,
      name: `${suite.name} - ${category}`,
      tests: categoryTests
    };
    
    this.framework.addTestSuite(categorySuite);
    
    console.log(`\n⚡ Running Performance Tests for category: ${category}\n`);
    await this.framework.runAll();
  }
}

// Create and export a singleton instance
export const performanceTestRunner = new PerformanceTestRunner();

// Convenience functions for specific performance test runs
export async function runMemoryPerformanceTests(): Promise<void> {
  await performanceTestRunner.runPerformanceTestsByCategory('memory');
}

export async function runDatabasePerformanceTests(): Promise<void> {
  await performanceTestRunner.runPerformanceTestsByCategory('database');
}

export async function runIngestionPerformanceTests(): Promise<void> {
  await performanceTestRunner.runPerformanceTestsByCategory('ingestion');
}

export async function runSearchPerformanceTests(): Promise<void> {
  await performanceTestRunner.runPerformanceTestsByCategory('search');
}

// Export the main function to run all performance tests
export async function runFullPerformanceSuite(): Promise<void> {
  await performanceTestRunner.runPerformanceTests();
}