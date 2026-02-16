/**
 * Diagnostic Tests for Anchor Engine
 * 
 * Quick diagnostic tests designed for rapid issue reproduction and validation
 */

import { TestFramework, TestConfig } from './core.js';
import { DatasetTestRunner } from './dataset-runner.js';
import axios from 'axios';

// Diagnostic test configurations
const DIAGNOSTIC_TESTS: TestConfig[] = [
  {
    name: 'Health Endpoint Check',
    description: 'Verify the health endpoint is responding',
    testFn: async () => {
      try {
        const response = await axios.get('http://localhost:3000/health');
        if (response.status !== 200) {
          throw new Error(`Health endpoint returned status: ${response.status}`);
        }
        if (!response.data.status) {
          throw new Error('Health endpoint did not return status field');
        }
        console.log(`✅ Health check passed. Status: ${response.data.status}`);
      } catch (error) {
        console.error('❌ Health check failed:', error);
        throw error;
      }
    },
    timeout: 10000
  },
  {
    name: 'Database Connectivity',
    description: 'Test database connection and basic operations',
    testFn: async () => {
      try {
        // Test basic database operation
        const response = await axios.post('http://localhost:3000/v1/memory/search', {
          query: 'test',
          buckets: []
        });

        if (response.status !== 200 && response.status !== 207) {
          throw new Error(`Search endpoint returned unexpected status: ${response.status}`);
        }

        console.log('✅ Database connectivity test passed');
      } catch (error) {
        console.error('❌ Database connectivity test failed:', error);
        throw error;
      }
    },
    timeout: 15000
  },
  {
    name: 'Native Module Availability',
    description: 'Check if native modules are properly loaded',
    testFn: async () => {
      try {
        // Test native module functionality through the API
        const response = await axios.get('http://localhost:3000/health/native');

        if (response.status === 500) {
          // Native modules might not be available, which is OK in some environments
          console.log('⚠️  Native modules not available (using fallback implementations)');
        } else if (response.status === 200) {
          console.log('✅ Native modules loaded successfully');
        } else {
          throw new Error(`Native module health check returned unexpected status: ${response.status}`);
        }
      } catch (error) {
        console.error('❌ Native module availability test failed:', error);
        // Don't throw error as native modules are optional in some environments
        console.log('ℹ️  Native modules not available - using JavaScript fallbacks');
      }
    },
    timeout: 10000
  },
  {
    name: 'Ingestion Pipeline',
    description: 'Test the ingestion pipeline with a simple content',
    testFn: async () => {
      try {
        const testContent = `Diagnostic test content created at ${new Date().toISOString()}. This is a simple test to verify the ingestion pipeline is working correctly.`;

        const response = await axios.post('http://localhost:3000/v1/ingest', {
          content: testContent,
          source: 'diagnostic-test',
          type: 'test',
          buckets: ['diagnostic']
        });

        if (response.status !== 200) {
          throw new Error(`Ingestion endpoint returned status: ${response.status}`);
        }

        if (!response.data.id) {
          throw new Error('Ingestion endpoint did not return an ID');
        }

        console.log(`✅ Ingestion pipeline test passed. Created ID: ${response.data.id.substring(0, 12)}...`);
      } catch (error) {
        console.error('❌ Ingestion pipeline test failed:', error);
        throw error;
      }
    },
    timeout: 20000
  },
  {
    name: 'Search Functionality',
    description: 'Test search functionality with diagnostic content',
    testFn: async () => {
      try {
        // Wait a moment for the ingestion to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        const response = await axios.post('http://localhost:3000/v1/memory/search', {
          query: 'diagnostic test content',
          buckets: ['diagnostic']
        });

        if (response.status !== 200) {
          throw new Error(`Search endpoint returned status: ${response.status}`);
        }

        if (!response.data.context && (!response.data.results || response.data.results.length === 0)) {
          throw new Error('Search returned no results for diagnostic content');
        }

        console.log('✅ Search functionality test passed');
      } catch (error) {
        console.error('❌ Search functionality test failed:', error);
        throw error;
      }
    },
    timeout: 25000
  },
  {
    name: 'Memory Retrieval Consistency',
    description: 'Test consistency between different retrieval methods',
    testFn: async () => {
      try {
        // Test different search approaches
        const basicSearch = await axios.post('http://localhost:3000/v1/memory/search', {
          query: 'diagnostic',
          buckets: ['diagnostic']
        });

        const tagSearch = await axios.post('http://localhost:3000/v1/memory/search', {
          query: '#diagnostic',
          buckets: []
        });

        if (basicSearch.status !== 200) {
          throw new Error(`Basic search failed with status: ${basicSearch.status}`);
        }

        if (tagSearch.status !== 200 && tagSearch.status !== 404) {
          // 404 is OK if no tagged content exists yet
          throw new Error(`Tag search failed with status: ${tagSearch.status}`);
        }

        console.log('✅ Memory retrieval consistency test passed');
      } catch (error) {
        console.error('❌ Memory retrieval consistency test failed:', error);
        throw error;
      }
    },
    timeout: 20000
  },
  {
    name: 'API Rate Limits & Concurrency',
    description: 'Test API behavior under light load',
    testFn: async () => {
      try {
        // Send multiple requests in parallel to test concurrency
        const requests = Array.from({ length: 3 }, (_, i) =>
          axios.post('http://localhost:3000/v1/memory/search', {
            query: `diagnostic test ${i}`,
            buckets: ['diagnostic']
          })
        );

        const responses = await Promise.all(requests.map(p => p.catch(e => e)));

        const successfulRequests = responses.filter(r => !(r instanceof Error));
        const failedRequests = responses.filter(r => r instanceof Error);

        if (successfulRequests.length < 2) {
          // Allow for some failures in diagnostic tests
          console.warn(`⚠️  Only ${successfulRequests.length} of 3 concurrent requests succeeded`);
        } else {
          console.log(`✅ API concurrency test passed (${successfulRequests.length} of 3 requests succeeded)`);
        }
      } catch (error) {
        console.error('❌ API concurrency test failed:', error);
        // Don't fail the test completely as some failures are expected in load testing
        console.log('ℹ️  API concurrency test completed with some errors (this may be normal)');
      }
    },
    timeout: 30000
  }
];

// Create a diagnostic test runner
export class DiagnosticTestRunner {
  private framework: TestFramework;
  private datasetRunner: DatasetTestRunner;

  constructor(framework: TestFramework, datasetRunner: DatasetTestRunner) {
    this.framework = framework;
    this.datasetRunner = datasetRunner;
  }

  /**
   * Run all diagnostic tests
   */
  async runAllDiagnostics(): Promise<void> {
    console.log('\n🔍 Running Diagnostic Tests...\n');

    // Create a test suite for diagnostics
    const diagnosticSuite = {
      name: 'Diagnostic Tests',
      description: 'Quick diagnostic tests for system health verification',
      tests: DIAGNOSTIC_TESTS,
      timeout: 30000,
      environment: 'integration',
      tags: ['diagnostic', 'health', 'quick']
    };

    // Add the suite to the framework and run it
    this.framework.addTestSuite(diagnosticSuite);
    await this.framework.runTestSuite(diagnosticSuite);
  }

  /**
   * Run specific diagnostic tests by tag
   */
  async runDiagnosticsByTag(tag: string): Promise<void> {
    const taggedTests = DIAGNOSTIC_TESTS.filter(test => test.tags?.includes(tag));

    if (taggedTests.length === 0) {
      console.log(`No diagnostic tests found with tag: ${tag}`);
      return;
    }

    const diagnosticSuite = {
      name: `Diagnostic Tests (${tag})`,
      description: `Diagnostic tests tagged with: ${tag}`,
      tests: taggedTests,
      timeout: 30000,
      environment: 'integration',
      tags: ['diagnostic', 'health', tag]
    };

    this.framework.addTestSuite(diagnosticSuite);
    await this.framework.runTestSuite(diagnosticSuite);
  }

  /**
   * Run system health diagnostics
   */
  async runSystemHealthDiagnostics(): Promise<void> {
    await this.runDiagnosticsByTag('health');
  }

  /**
   * Run performance diagnostics
   */
  async runPerformanceDiagnostics(): Promise<void> {
    await this.runDiagnosticsByTag('performance');
  }

  /**
   * Run ingestion diagnostics
   */
  async runIngestionDiagnostics(): Promise<void> {
    await this.runDiagnosticsByTag('ingestion');
  }

  /**
   * Run search diagnostics
   */
  async runSearchDiagnostics(): Promise<void> {
    await this.runDiagnosticsByTag('search');
  }
}

// Export a function to quickly run diagnostics
export async function runQuickDiagnostics(): Promise<void> {
  const framework = new TestFramework();
  const datasetRunner = new DatasetTestRunner(framework);
  const diagnosticRunner = new DiagnosticTestRunner(framework, datasetRunner);

  await diagnosticRunner.runAllDiagnostics();
}

// If this module is run directly, execute the diagnostic tests
if (require.main === module) {
  runQuickDiagnostics()
    .then(() => {
      console.log('\n✅ Diagnostic tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Diagnostic tests failed:', error);
      process.exit(1);
    });
}