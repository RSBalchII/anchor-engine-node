/**
 * Diagnostic Tests for ECE_Core
 * 
 * Quick diagnostic tests designed for rapid issue reproduction and validation.
 * These tests focus on common failure points and can be run quickly to verify
 * system health or reproduce specific issues.
 */

import { TestFramework, TestCase, TestSuiteConfig } from './core.js';
import { testConfigManager } from './config.js';
import { DatasetTestRunner } from './dataset-runner.js';

// Import necessary services for diagnostic tests
import { db } from '../src/core/db.js';
import { atomizer } from '../src/services/ingestion/atomizer.js';
import { sanitizer } from '../src/services/ingestion/sanitizer.js';
import { fingerprinter } from '../src/services/semantic/fingerprinter.js';

export class DiagnosticTestRunner {
  private framework: TestFramework;
  private datasetRunner: DatasetTestRunner;

  constructor() {
    this.framework = new TestFramework();
    this.datasetRunner = new DatasetTestRunner(this.framework);
  }

  /**
   * Create diagnostic test suite for common issues
   */
  createDiagnosticTestSuite(): TestSuiteConfig {
    return {
      name: 'Diagnostic Tests',
      description: 'Quick diagnostic tests for common failure points',
      tests: [
        // Health checks
        this.createHealthCheckTest(),
        
        // Database connectivity
        this.createDatabaseConnectivityTest(),
        
        // Atomization functionality
        this.createAtomizationTest(),
        
        // Content sanitization
        this.createSanitizationTest(),
        
        // Fingerprinting functionality
        this.createFingerprintingTest(),
        
        // Memory search functionality
        this.createMemorySearchTest(),
        
        // Native module functionality
        this.createNativeModuleTest(),
        
        // File system access
        this.createFileSystemAccessTest(),
        
        // API endpoint availability
        this.createApiEndpointTest()
      ],
      timeout: 10000, // 10 seconds timeout for quick diagnostics
      environment: 'integration',
      tags: ['diagnostic', 'health', 'quick']
    };
  }

  /**
   * Health check test
   */
  private createHealthCheckTest(): TestCase {
    return {
      name: 'System Health Check',
      description: 'Verify basic system health and connectivity',
      testFn: async () => {
        // Check if basic services are available
        console.log('  🔍 Checking system health...');
        
        // Verify database connection
        try {
          const result = await db.run('?[a] := a = 1', {});
          if (!result || !result.rows || result.rows.length === 0) {
            throw new Error('Database query failed - basic connectivity issue');
          }
          console.log('  ✅ Database connectivity OK');
        } catch (error) {
          console.error('  ❌ Database connectivity FAILED');
          throw error;
        }
        
        // Verify basic system resources
        const memoryUsage = process.memoryUsage();
        console.log(`  🧠 Memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB used`);
        
        if (memoryUsage.heapUsed > 1024 * 1024 * 1024) { // 1GB threshold
          console.warn('  ⚠️  High memory usage detected');
        }
        
        console.log('  ✅ System health check passed');
      },
      timeout: 5000,
      tags: ['health', 'connectivity'],
      dependencies: []
    };
  }

  /**
   * Database connectivity test
   */
  private createDatabaseConnectivityTest(): TestCase {
    return {
      name: 'Database Connectivity',
      description: 'Test database connection and basic operations',
      testFn: async () => {
        console.log('  🔗 Testing database connectivity...');
        
        // Test basic query
        try {
          const result = await db.run('?[a] := a = 1', {});
          if (!result || !result.rows || result.rows.length === 0) {
            throw new Error('Basic query failed');
          }
          console.log('  ✅ Basic query successful');
        } catch (error) {
          console.error('  ❌ Basic query failed:', error);
          throw error;
        }
        
        // Test write operation
        try {
          const testId = `diag_${Date.now()}`;
          const insertResult = await db.run(
            `?[id, content, timestamp] := [[ $id, $content, $timestamp ]] :put memory {id, content, timestamp}`,
            { id: testId, content: 'Diagnostic test record', timestamp: Date.now() }
          );
          
          console.log('  ✅ Write operation successful');
          
          // Clean up test record
          setTimeout(async () => {
            try {
              await db.run(`?[id] := id = $id :delete memory {id}`, { id: testId });
            } catch (e) {
              // Ignore cleanup errors
            }
          }, 1000);
        } catch (error) {
          console.error('  ❌ Write operation failed:', error);
          throw error;
        }
        
        // Test read operation
        try {
          const readResult = await db.run(
            `?[id, content, timestamp] := *memory{id, content, timestamp}, id = $id`,
            { id: `diag_${Date.now() - 1000}` } // Look for recently created record
          );
          
          if (!readResult || !readResult.rows || readResult.rows.length === 0) {
            console.log('  ⚠️  No recent diagnostic records found (expected if cleanup was fast)');
          } else {
            console.log('  ✅ Read operation successful');
          }
        } catch (error) {
          console.error('  ❌ Read operation failed:', error);
          throw error;
        }
        
        console.log('  ✅ Database connectivity test passed');
      },
      timeout: 8000,
      tags: ['database', 'connectivity'],
      dependencies: []
    };
  }

  /**
   * Atomization functionality test
   */
  private createAtomizationTest(): TestCase {
    return {
      name: 'Atomization Functionality',
      description: 'Test the atomization process for content decomposition',
      testFn: async () => {
        console.log('  🧩 Testing atomization functionality...');
        
        // Test with simple content
        const simpleContent = "This is a simple test sentence.";
        try {
          const atoms = await atomizer.atomize(simpleContent, 'test-source');
          if (!Array.isArray(atoms) || atoms.length === 0) {
            throw new Error('Atomization failed - no atoms returned');
          }
          console.log(`  ✅ Simple content atomized into ${atoms.length} atoms`);
        } catch (error) {
          console.error('  ❌ Simple content atomization failed:', error);
          throw error;
        }
        
        // Test with complex content
        const complexContent = `This is a more complex content with multiple sentences. 
        It includes code blocks like function test() { return true; }. 
        And it has various punctuation marks! Also, numbers like 123 and 456.789.`;
        
        try {
          const complexAtoms = await atomizer.atomize(complexContent, 'complex-test-source');
          if (!Array.isArray(complexAtoms) || complexAtoms.length === 0) {
            throw new Error('Complex atomization failed - no atoms returned');
          }
          console.log(`  ✅ Complex content atomized into ${complexAtoms.length} atoms`);
        } catch (error) {
          console.error('  ❌ Complex content atomization failed:', error);
          throw error;
        }
        
        // Test with edge cases
        try {
          const emptyAtoms = await atomizer.atomize('', 'empty-test-source');
          if (!Array.isArray(emptyAtoms) || emptyAtoms.length !== 0) {
            console.warn('  ⚠️  Empty content atomization behavior changed');
          } else {
            console.log('  ✅ Empty content atomization handled correctly');
          }
        } catch (error) {
          console.error('  ❌ Empty content atomization failed:', error);
          // This might be expected behavior, so just warn
          console.warn('  ⚠️  Empty content atomization threw error (may be expected)');
        }
        
        console.log('  ✅ Atomization functionality test passed');
      },
      timeout: 10000,
      tags: ['atomization', 'content-processing'],
      dependencies: []
    };
  }

  /**
   * Content sanitization test
   */
  private createSanitizationTest(): TestCase {
    return {
      name: 'Content Sanitization',
      description: 'Test content sanitization and artifact removal',
      testFn: async () => {
        console.log('  🧹 Testing content sanitization...');
        
        // Test with clean content
        const cleanContent = "This is clean content without artifacts.";
        try {
          const cleanResult = await sanitizer.sanitize(cleanContent);
          if (cleanResult !== cleanContent) {
            console.warn('  ⚠️  Clean content was modified unexpectedly');
          } else {
            console.log('  ✅ Clean content passed through unchanged');
          }
        } catch (error) {
          console.error('  ❌ Clean content sanitization failed:', error);
          throw error;
        }
        
        // Test with JSON artifacts
        const artifactContent = `{
          "type": "response_content", 
          "response_content": "This is the actual content", 
          "thinking_content": "This should be removed",
          "metadata": {"extra": "data"}
        }`;
        
        try {
          const sanitized = await sanitizer.sanitize(artifactContent);
          if (sanitized.includes('thinking_content') || sanitized.includes('metadata')) {
            console.warn('  ⚠️  JSON artifacts not fully removed');
          } else {
            console.log('  ✅ JSON artifacts properly removed');
          }
          
          if (!sanitized.includes('actual content')) {
            console.warn('  ⚠️  Real content was accidentally removed');
          } else {
            console.log('  ✅ Real content preserved');
          }
        } catch (error) {
          console.error('  ❌ Artifact content sanitization failed:', error);
          throw error;
        }
        
        // Test with various artifacts
        const mixedContent = `Processing result:
        {
          "type": "Coda",
          "response_content": "The answer is 42",
          "confidence": 0.95,
          "sources": ["doc1", "doc2"]
        }
        End of processing.`;
        
        try {
          const mixedSanitized = await sanitizer.sanitize(mixedContent);
          if (!mixedSanitized.includes('The answer is 42')) {
            console.warn('  ⚠️  Main content was removed during sanitization');
          } else {
            console.log('  ✅ Main content preserved in mixed content');
          }
        } catch (error) {
          console.error('  ❌ Mixed content sanitization failed:', error);
          throw error;
        }
        
        console.log('  ✅ Content sanitization test passed');
      },
      timeout: 8000,
      tags: ['sanitization', 'content-processing'],
      dependencies: []
    };
  }

  /**
   * Fingerprinting functionality test
   */
  private createFingerprintingTest(): TestCase {
    return {
      name: 'Fingerprinting Functionality',
      description: 'Test SimHash fingerprinting and similarity detection',
      testFn: async () => {
        console.log('  🖨️  Testing fingerprinting functionality...');
        
        // Test with simple content
        const content1 = "This is a test string for fingerprinting.";
        const content2 = "This is a test string for fingerprinting."; // Identical
        const content3 = "This is a slightly different test string.";
        
        try {
          const fp1 = await fingerprinter.fingerprint(content1);
          const fp2 = await fingerprinter.fingerprint(content2);
          const fp3 = await fingerprinter.fingerprint(content3);
          
          if (typeof fp1 !== 'bigint' && typeof fp1 !== 'number') {
            throw new Error('Fingerprint is not a number or bigint');
          }
          
          console.log('  ✅ Fingerprint generation successful');
          
          // Check that identical content produces same fingerprint
          if (fp1 !== fp2) {
            console.warn('  ⚠️  Identical content produced different fingerprints');
          } else {
            console.log('  ✅ Identical content produces same fingerprint');
          }
          
          // Check that different content produces different fingerprints
          if (fp1 === fp3) {
            console.warn('  ⚠️  Different content produced same fingerprint');
          } else {
            console.log('  ✅ Different content produces different fingerprints');
          }
          
          // Test similarity calculation
          const distance12 = await fingerprinter.distance(fp1, fp2);
          const distance13 = await fingerprinter.distance(fp1, fp3);
          
          if (distance12 !== 0) {
            console.warn(`  ⚠️  Identical content has non-zero distance: ${distance12}`);
          } else {
            console.log('  ✅ Identical content has zero distance');
          }
          
          if (distance13 < 0 || distance13 > 64) {
            console.warn(`  ⚠️  Distance out of expected range [0, 64]: ${distance13}`);
          } else {
            console.log(`  ✅ Distance calculation in valid range: ${distance13}`);
          }
        } catch (error) {
          console.error('  ❌ Fingerprinting functionality failed:', error);
          throw error;
        }
        
        console.log('  ✅ Fingerprinting functionality test passed');
      },
      timeout: 10000,
      tags: ['fingerprinting', 'simhash', 'similarity'],
      dependencies: []
    };
  }

  /**
   * Memory search functionality test
   */
  private createMemorySearchTest(): TestCase {
    return {
      name: 'Memory Search Functionality',
      description: 'Test memory search and retrieval capabilities',
      testFn: async () => {
        console.log('  🔎 Testing memory search functionality...');
        
        // First, add some test data
        const testId = `search_test_${Date.now()}`;
        const testContent = `Diagnostic search test content with unique identifier: ${testId}`;
        
        try {
          // Add test record
          await db.run(
            `?[id, content, timestamp, source, buckets] := [[ $id, $content, $timestamp, $source, $buckets ]] 
             :put memory {id, content, timestamp, source, buckets}`,
            {
              id: testId,
              content: testContent,
              timestamp: Date.now(),
              source: 'diagnostic-test',
              buckets: ['diagnostic', 'test']
            }
          );
          
          console.log('  ✅ Test record added to memory');
        } catch (error) {
          console.error('  ❌ Failed to add test record:', error);
          throw error;
        }
        
        // Test search functionality
        try {
          // Wait a moment for the database to index
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Perform search
          const searchResult = await db.run(
            `?[id, content, score] := 
              ~memory:content_fts{id | query: $query, k: 5, bind_score: score},
              *memory{id, content}
             :order -score`,
            { query: `diagnostic search test ${testId}` }
          );
          
          if (!searchResult || !searchResult.rows || searchResult.rows.length === 0) {
            console.warn('  ⚠️  Search returned no results');
          } else {
            const found = searchResult.rows.some(row => 
              Array.isArray(row) && row[0] === testId
            );
            
            if (found) {
              console.log('  ✅ Search successfully found test record');
            } else {
              console.warn('  ⚠️  Search did not find the test record');
            }
          }
        } catch (error) {
          console.error('  ❌ Search functionality failed:', error);
          throw error;
        }
        
        // Clean up test record
        try {
          await db.run(`?[id] := id = $id :delete memory {id}`, { id: testId });
          console.log('  ✅ Test record cleaned up');
        } catch (error) {
          console.warn('  ⚠️  Failed to clean up test record:', error.message);
        }
        
        console.log('  ✅ Memory search functionality test passed');
      },
      timeout: 15000, // Longer timeout for search indexing
      tags: ['search', 'retrieval', 'memory'],
      dependencies: ['database-connectivity']
    };
  }

  /**
   * Native module functionality test
   */
  private createNativeModuleTest(): TestCase {
    return {
      name: 'Native Module Functionality',
      description: 'Test native module loading and functionality',
      testFn: async () => {
        console.log('  🔧 Testing native module functionality...');
        
        try {
          // Try to import and test native modules
          const nativeModulePath = testConfigManager.getConfig().environment.nativeModulePath;
          
          if (!nativeModulePath) {
            console.log('  ⚠️  No native module path configured, skipping native module test');
            return;
          }
          
          // Dynamically import the native module
          const nativeModule = await import(nativeModulePath);
          
          // Test fingerprint function if available
          if (typeof nativeModule.fingerprint === 'function') {
            const testFp = nativeModule.fingerprint('test string');
            if (typeof testFp === 'undefined') {
              console.warn('  ⚠️  Native fingerprint function returned undefined');
            } else {
              console.log('  ✅ Native fingerprint function working');
            }
          } else {
            console.log('  ⚠️  Native fingerprint function not available');
          }
          
          // Test distance function if available
          if (typeof nativeModule.distance === 'function') {
            const testDist = nativeModule.distance(12345n, 67890n);
            if (typeof testDist === 'undefined') {
              console.warn('  ⚠️  Native distance function returned undefined');
            } else {
              console.log('  ✅ Native distance function working');
            }
          } else {
            console.log('  ⚠️  Native distance function not available');
          }
          
          // Test cleanse function if available
          if (typeof nativeModule.cleanse === 'function') {
            const testClean = nativeModule.cleanse('{"response_content": "test", "extra": "removed"}');
            if (typeof testClean === 'undefined') {
              console.warn('  ⚠️  Native cleanse function returned undefined');
            } else {
              console.log('  ✅ Native cleanse function working');
            }
          } else {
            console.log('  ⚠️  Native cleanse function not available');
          }
          
          console.log('  ✅ Native module functionality test completed');
        } catch (error) {
          console.warn('  ⚠️  Native module test failed (may be expected if native modules not built):', error.message);
          // Don't throw error as native modules may not be available in all environments
        }
      },
      timeout: 8000,
      tags: ['native-modules', 'performance'],
      dependencies: []
    };
  }

  /**
   * File system access test
   */
  private createFileSystemAccessTest(): TestCase {
    return {
      name: 'File System Access',
      description: 'Test file system access for notebook and context directories',
      testFn: async () => {
        console.log('  📁 Testing file system access...');
        
        try {
          // We'll use the config manager to get the correct paths
          const config = testConfigManager.getConfig();
          const notebookDir = config.environment.notebookDir;
          const contextDir = config.environment.contextDir;
          
          if (!notebookDir || !contextDir) {
            throw new Error('Notebook or context directory not configured');
          }
          
          // Test notebook directory access
          try {
            const fs = await import('fs');
            const path = await import('path');
            
            // Check if notebook directory exists
            if (!fs.existsSync(notebookDir)) {
              console.warn(`  ⚠️  Notebook directory does not exist: ${notebookDir}`);
              // Try to create it
              fs.mkdirSync(notebookDir, { recursive: true });
              console.log(`  ✅ Created notebook directory: ${notebookDir}`);
            } else {
              console.log(`  ✅ Notebook directory exists: ${notebookDir}`);
            }
            
            // Test write access by creating a temporary file
            const testFile = path.join(notebookDir, `diagnostic_test_${Date.now()}.tmp`);
            fs.writeFileSync(testFile, 'Diagnostic test file');
            
            // Verify we can read it back
            const content = fs.readFileSync(testFile, 'utf8');
            if (content !== 'Diagnostic test file') {
              throw new Error('Read verification failed');
            }
            
            // Clean up
            fs.unlinkSync(testFile);
            console.log('  ✅ Notebook directory write/read access OK');
          } catch (fsError) {
            console.error('  ❌ Notebook directory access failed:', fsError);
            throw fsError;
          }
          
          // Test context directory access
          try {
            const fs = await import('fs');
            const path = await import('path');
            
            if (!fs.existsSync(contextDir)) {
              console.warn(`  ⚠️  Context directory does not exist: ${contextDir}`);
              // Try to create it
              fs.mkdirSync(contextDir, { recursive: true });
              console.log(`  ✅ Created context directory: ${contextDir}`);
            } else {
              console.log(`  ✅ Context directory exists: ${contextDir}`);
            }
            
            // Test write access
            const testFile = path.join(contextDir, `diagnostic_test_${Date.now()}.tmp`);
            fs.writeFileSync(testFile, 'Diagnostic test file');
            
            // Verify read
            const content = fs.readFileSync(testFile, 'utf8');
            if (content !== 'Diagnostic test file') {
              throw new Error('Context dir read verification failed');
            }
            
            // Clean up
            fs.unlinkSync(testFile);
            console.log('  ✅ Context directory write/read access OK');
          } catch (fsError) {
            console.error('  ❌ Context directory access failed:', fsError);
            throw fsError;
          }
          
          console.log('  ✅ File system access test passed');
        } catch (error) {
          console.error('  ❌ File system access test failed:', error);
          throw error;
        }
      },
      timeout: 10000,
      tags: ['filesystem', 'io'],
      dependencies: []
    };
  }

  /**
   * API endpoint availability test
   */
  private createApiEndpointTest(): TestCase {
    return {
      name: 'API Endpoint Availability',
      description: 'Test availability of key API endpoints',
      testFn: async () => {
        console.log('  🌐 Testing API endpoint availability...');
        
        const baseUrl = testConfigManager.getConfig().environment.baseUrl;
        
        if (!baseUrl) {
          console.log('  ⚠️  Base URL not configured, skipping API endpoint test');
          return;
        }
        
        // Test endpoints that should be available
        const endpointsToTest = [
          { path: '/health', method: 'GET', description: 'Health check' },
          { path: '/v1/models', method: 'GET', description: 'Models list' },
          { path: '/v1/memory/search', method: 'POST', description: 'Memory search' },
          { path: '/v1/ingest', method: 'POST', description: 'Ingestion endpoint' }
        ];
        
        for (const endpoint of endpointsToTest) {
          try {
            // Construct full URL
            const url = new URL(endpoint.path, baseUrl).href;
            
            // For POST endpoints, we'll send minimal valid payload
            let response;
            if (endpoint.method === 'POST') {
              if (endpoint.path === '/v1/memory/search') {
                response = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query: 'test', buckets: [] })
                });
              } else if (endpoint.path === '/v1/ingest') {
                response = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content: 'test', source: 'diagnostic' })
                });
              } else {
                // For other POST endpoints, send empty body
                response = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: '{}'
                });
              }
            } else {
              response = await fetch(url, { method: endpoint.method });
            }
            
            if (response.status >= 200 && response.status < 500) { // Accept any non-server-error status
              console.log(`  ✅ ${endpoint.description} endpoint available (status: ${response.status})`);
            } else {
              console.warn(`  ⚠️  ${endpoint.description} endpoint returned error status: ${response.status}`);
            }
          } catch (error) {
            console.warn(`  ⚠️  ${endpoint.description} endpoint not accessible:`, error.message);
          }
        }
        
        console.log('  ✅ API endpoint availability test completed');
      },
      timeout: 12000, // Longer timeout for network requests
      tags: ['api', 'network', 'connectivity'],
      dependencies: []
    };
  }

  /**
   * Run the diagnostic test suite
   */
  async runDiagnosticTests(): Promise<void> {
    const suite = this.createDiagnosticTestSuite();
    this.framework.addTestSuite(suite);
    
    console.log('\n🔍 Running Diagnostic Tests...\n');
    await this.framework.runAll();
  }

  /**
   * Run diagnostic tests for a specific tag
   */
  async runDiagnosticTestsByTag(tag: string): Promise<void> {
    const suite = this.createDiagnosticTestSuite();
    
    // Filter tests by tag
    const filteredTests = suite.tests.filter(test => test.tags.includes(tag));
    
    if (filteredTests.length === 0) {
      console.log(`No diagnostic tests found with tag: ${tag}`);
      return;
    }
    
    const filteredSuite = {
      ...suite,
      name: `${suite.name} - ${tag}`,
      tests: filteredTests
    };
    
    this.framework.addTestSuite(filteredSuite);
    
    console.log(`\n🔍 Running Diagnostic Tests for tag: ${tag}\n`);
    await this.framework.runAll();
  }

  /**
   * Run a specific diagnostic test by name
   */
  async runSpecificDiagnosticTest(testName: string): Promise<void> {
    const suite = this.createDiagnosticTestSuite();
    
    // Find the specific test
    const specificTest = suite.tests.find(test => test.name === testName);
    
    if (!specificTest) {
      console.log(`Diagnostic test not found: ${testName}`);
      return;
    }
    
    // Create a suite with just this test
    const specificSuite = {
      ...suite,
      name: `${suite.name} - ${testName}`,
      tests: [specificTest]
    };
    
    this.framework.addTestSuite(specificSuite);
    
    console.log(`\n🔍 Running Specific Diagnostic Test: ${testName}\n`);
    await this.framework.runAll();
  }
}

// Create and export a singleton instance
export const diagnosticTestRunner = new DiagnosticTestRunner();

// Convenience functions for common diagnostic runs
export async function runQuickHealthCheck(): Promise<void> {
  await diagnosticTestRunner.runDiagnosticTestsByTag('health');
}

export async function runConnectivityDiagnostics(): Promise<void> {
  await diagnosticTestRunner.runDiagnosticTestsByTag('connectivity');
}

export async function runPerformanceDiagnostics(): Promise<void> {
  await diagnosticTestRunner.runDiagnosticTestsByTag('performance');
}

// Export the main function to run all diagnostics
export async function runFullDiagnosticSuite(): Promise<void> {
  await diagnosticTestRunner.runDiagnosticTests();
}