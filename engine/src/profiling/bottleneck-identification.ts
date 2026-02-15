/**
 * Native Module Bottleneck Identification Script
 * 
 * Identifies performance bottlenecks in native modules by running comprehensive profiling
 */

import { nativeModuleProfiler } from '../utils/native-module-profiler.js';
import { logWithContext } from '../utils/structured-logger.js';
import { ProfilingConfig } from '../utils/native-module-profiler.js';

// Comprehensive test data for bottleneck identification
function generateBottleneckTestData(): { [key: string]: any[] } {
  return {
    atomize: [
      // Short content
      "Short text",
      // Medium content
      "This is medium length content for testing atomization performance.",
      // Long content
      "The Sovereign Context Engine is a sophisticated system designed to manage personal and professional knowledge. It uses advanced techniques to organize, retrieve, and connect information across different contexts and time periods. The system is built with privacy and local processing as core principles. It implements the Tag-Walker protocol for efficient retrieval without relying on heavy vector embeddings. The Atomic Architecture breaks content into Compounds, Molecules, and Atoms for granular access. This allows for precise retrieval of specific information without polluting the context window with irrelevant data.",
      // Content with special characters
      "Special chars: @#$%^&*()_+{}|:<>?[]\\;'\",./~`",
      // Content with Unicode
      "Unicode: ñöñë 例 子 예 ש שּ",
      // Content with code
      "function test() { const x = 1; return x * 2; }",
      // Content with JSON artifacts
      '{"type": "test", "content": "value", "nested": {"data": "value"}}',
      // Mixed content
      "# Header\n\nParagraph with [link](http://example.com) and `code`.\n\n- Item 1\n- Item 2\n\n```javascript\nconsole.log(\"test\");\n```",
      // Very long content
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " + "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ".repeat(50),
      // Content with many special patterns
      "Pattern1: {\"key\": \"value\"}, Pattern2: {\"nested\": {\"data\": \"value\"}}, Pattern3: [\"array\", \"of\", \"values\"]"
    ],
    sanitize: [
      // Clean content
      "This is clean content without artifacts.",
      // Content with JSON wrapper
      "{\"response_content\": \"This is the actual content\", \"metadata\": {\"extra\": \"data\"}}",
      // Content with multiple artifacts
      `{
        "type": "Coda",
        "response_content": "Real content",
        "thinking_content": "Internal thoughts",
        "metadata": {"source": "test"}
      }`,
      // Content with escaped JSON
      `{\"response_content\": \"Escaped content\", \"extra\": \"data\"}`,
      // Content with mixed artifacts
      `Processing result:
      {
        "response_content": "The answer",
        "confidence": 0.95
      }
      End of processing.`
    ],
    fingerprint: [
      // Short strings
      "short",
      // Medium strings
      "This is a medium length string for SimHash testing",
      // Long strings
      "The SimHash algorithm creates a compact fingerprint of content that can be compared efficiently to detect near-duplicates. This is essential for the ECE's deduplication capabilities.",
      // Strings with special characters
      "Special chars: @#$%^&*()_+|}{:?><\"`~",
      // Unicode strings
      "Unicode: 例 子 예 ש שּ",
      // Technical strings
      "function calculateFingerprint(content) { /* implementation */ }",
      // Mixed content
      "Mixed: {\"json\": \"data\"} and plain text",
      // Long technical content
      "The CozoDB database uses a graph-relational-vector-fts engine to provide unified access to different data models. This allows for complex queries that span across traditional relational, graph, and full-text search paradigms.",
      // Repetitive content (should have similar fingerprints)
      "This is repetitive content. This is repetitive content. This is repetitive content.",
      "Also repetitive: Also repetitive: Also repetitive:"
    ],
    distance: [
      // Similar fingerprints (should have low distance)
      { a: "fingerprint_very_similar_1", b: "fingerprint_very_similar_2" },
      // Different fingerprints (should have high distance)
      { a: "completely_different_fingerprint_1", b: "totally_unrelated_fingerprint_2" },
      // Moderate similarity
      { a: "moderately_similar_content_A", b: "moderately_similar_content_B" },
      // Edge cases
      { a: "identical_fingerprint", b: "identical_fingerprint" },
      { a: "short_fp", b: "much_longer_fingerprint_with_more_complexity" }
    ],
    cleanse: [
      // Content with various artifacts
      `{
        "thinking_content": "Internal thought process",
        "response_content": "Public response",
        "raw_content": "Original input",
        "processed_content": "Cleaned output"
      }`,
      // Content with nested artifacts
      `{
        "level1": {
          "level2": {
            "response_content": "Deeply nested real content",
            "internal": {"data": "should be removed"}
          }
        }
      }`,
      // Content with multiple artifact types
      `{
        "response_content": "Main content",
        "thinking_content": "Internal thoughts",
        "tool_call": {"name": "search", "args": {"query": "test"}},
        "intermediate_result": "temporary data",
        "final_answer": "The actual answer"
      }`,
      // Content with special characters and artifacts
      `{
        "response_content": "Content with special chars: @#$%^&*()",
        "symbols": ["@", "#", "$", "%", "^", "&", "*", "(", ")"],
        "metadata": {"preserved": true}
      }`,
      // Very large content with artifacts
      `{
        "response_content": "` + 
        "This is a very long response content string that contains lots of meaningful information ".repeat(10) +
        `",
        "metadata": {` +
        `"field1": "value1", "field2": "value2", "field3": "value3", `.repeat(5) +
        `}
      }`
    ]
  };
}

// Run bottleneck identification
async function runBottleneckIdentification() {
  logWithContext.info('Starting native module bottleneck identification...');
  
  try {
    // Generate comprehensive test data
    const testData = generateBottleneckTestData();
    logWithContext.info('Generated comprehensive test data for bottleneck identification');
    
    // Define profiling configurations for different operations
    const configs: ProfilingConfig[] = [
      {
        operation: 'atomize',
        iterations: 50,
        testData: testData.atomize,
        parameters: { strategy: 'mixed' }
      },
      {
        operation: 'sanitize',
        iterations: 50,
        testData: testData.sanitize,
        parameters: {}
      },
      {
        operation: 'fingerprint',
        iterations: 100,
        testData: testData.fingerprint,
        parameters: {}
      },
      {
        operation: 'distance',
        iterations: 30,
        testData: testData.distance,
        parameters: {}
      },
      {
        operation: 'cleanse',
        iterations: 40,
        testData: testData.cleanse,
        parameters: {}
      }
    ];
    
    // Run all profiling configurations
    logWithContext.info('Executing comprehensive bottleneck profiling...', {
      operations: configs.map(c => c.operation),
      totalIterations: configs.reduce((sum, c) => sum + c.iterations, 0)
    });
    
    const results = await nativeModuleProfiler.profileMultiple(configs);
    
    // Log summary of results
    logWithContext.info('Bottleneck identification completed', {
      operationsProfiled: results.length,
      totalOperations: results.reduce((sum: number, r: any) => sum + r.iterations, 0)
    });
    
    // Generate detailed report
    const report = nativeModuleProfiler.generateReport();
    console.log('\n' + report);
    
    // Identify slowest operations
    const slowest = nativeModuleProfiler.getSlowestOperations(5);
    console.log('\nSlowest Operations:');
    slowest.forEach((op: any, idx: number) => {
      console.log(`  ${idx + 1}. ${op.operation}: ${op.avgDuration.toFixed(4)}ms avg (${op.minDuration.toFixed(4)}ms - ${op.maxDuration.toFixed(4)}ms)`);
    });
    
    // Identify highest memory impact operations
    const highMemory = nativeModuleProfiler.getHighestMemoryImpact(5);
    console.log('\nHighest Memory Impact Operations:');
    highMemory.forEach((op: any, idx: number) => {
      console.log(`  ${idx + 1}. ${op.operation}: ${op.memoryDelta.toFixed(2)}MB change`);
    });
    
    // Analyze bottlenecks
    console.log('\nBottleneck Analysis:');
    results.forEach(result => {
      // Flag operations that are significantly slower than average
      const avgOfAll = results.reduce((sum: number, r: any) => sum + r.avgDuration, 0) / results.length;
      if (result.avgDuration > avgOfAll * 2) {
        console.log(`  ⚠️  ${result.operation} is ${(result.avgDuration / avgOfAll).toFixed(1)}x slower than average (${result.avgDuration.toFixed(4)}ms vs ${avgOfAll.toFixed(4)}ms)`);
      }
      
      // Flag operations with high memory impact
      if (Math.abs(result.memoryDelta) > 1.0) { // More than 1MB change
        console.log(`  ⚠️  ${result.operation} has high memory impact: ${result.memoryDelta.toFixed(2)}MB`);
      }
      
      // Flag operations with high variance
      const variance = result.maxDuration - result.minDuration;
      if (variance > result.avgDuration * 0.5) { // Variance > 50% of average
        console.log(`  ⚠️  ${result.operation} has high variance: ${result.minDuration.toFixed(4)}ms - ${result.maxDuration.toFixed(4)}ms (avg: ${result.avgDuration.toFixed(4)}ms)`);
      }
    });
    
    // Generate optimization recommendations
    console.log('\nOptimization Recommendations:');
    
    // Check for operations that might benefit from caching
    if (slowest.some((op: any) => op.operation === 'fingerprint' && op.avgDuration > 10)) {
      console.log('  - Consider implementing fingerprint caching for repeated content');
    }
    
    if (slowest.some((op: any) => op.operation === 'distance' && op.avgDuration > 5)) {
      console.log('  - Consider optimizing distance calculation algorithm or implementing result caching');
    }
    
    if (slowest.some((op: any) => op.operation === 'atomize' && op.avgDuration > 20)) {
      console.log('  - Consider optimizing atomization algorithm for specific content types');
    }
    
    if (highMemory.some((op: any) => op.memoryDelta > 2)) {
      console.log('  - Investigate memory management in high-impact operations');
    }
    
    return results;
  } catch (error) {
    logWithContext.error('Error during bottleneck identification', error as Error);
    throw error;
  }
}

// If this script is run directly
if (require.main === module) {
  runBottleneckIdentification()
    .then(() => {
      logWithContext.info('Native module bottleneck identification script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logWithContext.error('Native module bottleneck identification script failed', error);
      process.exit(1);
    });
}

export { runBottleneckIdentification };