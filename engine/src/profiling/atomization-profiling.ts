/**
 * Atomization Performance Profiling Script
 * 
 * Profiles the performance of the atomization process in native modules
 */

import { nativeModuleProfiler, ProfilingConfig } from '../utils/native-module-profiler.js';
import { logWithContext } from '../utils/structured-logger.js';

// Generate test data for atomization profiling
function generateAtomizationTestData(): any[] {
  const testData = [];
  
  // Different types of content to test atomization performance
  const samples = [
    // Short prose
    "This is a short sentence for testing.",
    
    // Longer prose
    "The Sovereign Context Engine is a sophisticated system designed to manage personal and professional knowledge. It uses advanced techniques to organize, retrieve, and connect information across different contexts and time periods. The system is built with privacy and local processing as core principles.",
    
    // Code snippet
    `function exampleFunction() {
  const data = [1, 2, 3, 4, 5];
  return data.map(x => x * 2).filter(x => x > 4);
}`,
    
    // Mixed content with special characters
    "JSON data: {\"key\": \"value\", \"nested\": {\"array\": [1, 2, 3]}} and some text with symbols: @#$%^&*()",
    
    // Log-like content
    "2023-10-15T10:30:00Z INFO: User login successful for user@example.com - Session ID: abc123xyz",
    
    // Technical documentation
    "The CozoDB database uses a graph-relational-vector-fts engine to provide unified access to different data models. This allows for complex queries that span across traditional relational, graph, and full-text search paradigms.",
    
    // Markdown content
    "# Header\n\nThis is a paragraph with [a link](http://example.com) and `inline code`.\n\n- List item 1\n- List item 2",
    
    // Configuration content
    "server {\n  listen 80;\n  server_name example.com;\n  location / {\n    proxy_pass http://backend;\n  }\n}",
    
    // Data table content (CSV-like)
    "Name,Age,City\nJohn Doe,30,New York\nJane Smith,25,Los Angeles\nBob Johnson,35,Chicago",
    
    // Long text with multiple sentences
    "The quick brown fox jumps over the lazy dog. This sentence contains all letters of the alphabet. Performance testing requires diverse inputs. Different content types stress different parts of the parsing algorithm. Complex nested structures test the recursion limits. Special characters test the sanitization routines. Unicode characters test the encoding handling. Very long inputs test the memory management. Short inputs test the overhead. Medium inputs test the typical usage patterns."
  ];

  for (let i = 0; i < 50; i++) { // Create 50 variations
    const baseIdx = i % samples.length;
    const variation = `${samples[baseIdx]} [Variation ${i}]`;
    testData.push(variation);
  }

  return testData;
}

// Run atomization profiling
async function runAtomizationProfiling() {
  logWithContext.info('Starting atomization performance profiling...');
  
  try {
    // Generate test data
    const testData = generateAtomizationTestData();
    logWithContext.info(`Generated ${testData.length} test samples for atomization profiling`);
    
    // Define profiling configuration
    const config: ProfilingConfig = {
      operation: 'atomize',
      iterations: 100,
      testData: testData,
      parameters: {
        strategy: 'mixed' // Test with mixed content strategy
      }
    };
    
    // Run the profiling
    logWithContext.info('Executing atomization profiling...', {
      operation: config.operation,
      iterations: config.iterations,
      testDataSize: testData.length
    });
    
    const result = await nativeModuleProfiler.profileOperation(config);
    
    // Log the results
    logWithContext.info('Atomization profiling completed', {
      operation: result.operation,
      totalDuration: `${result.duration.toFixed(2)}ms`,
      avgDuration: `${result.avgDuration.toFixed(4)}ms per operation`,
      minDuration: `${result.minDuration.toFixed(4)}ms`,
      maxDuration: `${result.maxDuration.toFixed(4)}ms`,
      memoryDelta: `${result.memoryDelta.toFixed(2)}MB`,
      iterations: result.iterations
    });
    
    // Generate and save report
    const report = nativeModuleProfiler.generateReport();
    console.log('\n' + report);
    
    // Identify slowest operations
    const slowest = nativeModuleProfiler.getSlowestOperations(3);
    if (slowest.length > 0) {
      console.log('Slowest Operations:');
      slowest.forEach((op: any, idx: number) => {
        console.log(`  ${idx + 1}. ${op.operation}: ${op.avgDuration.toFixed(4)}ms avg`);
      });
    }
    
    return result;
  } catch (error) {
    logWithContext.error('Error during atomization profiling', error as Error);
    throw error;
  }
}

// If this script is run directly
if (require.main === module) {
  runAtomizationProfiling()
    .then(() => {
      logWithContext.info('Atomization profiling script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logWithContext.error('Atomization profiling script failed', error);
      process.exit(1);
    });
}

export { runAtomizationProfiling };