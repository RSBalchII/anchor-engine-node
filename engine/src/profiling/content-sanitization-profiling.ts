/**
 * Content Sanitization Performance Profiling Script
 * 
 * Profiles the performance of content sanitization in native modules
 * This includes the "Key Assassin" functionality for cleaning JSON artifacts
 */

import { nativeModuleProfiler, ProfilingConfig } from '../utils/native-module-profiler.js';
import { logWithContext } from '../utils/structured-logger.js';

// Generate test data for sanitization profiling
function generateSanitizationTestData(): any[] {
  const testData = [];
  
  // Different types of content to test sanitization performance
  const samples = [
    // Clean content (should pass through quickly)
    "This is clean content without any artifacts.",
    
    // Content with JSON artifacts
    `{\"type\": \"response_content\", \"response_content\": \"This is the actual content\", \"timestamp\": \"2023-01-01T00:00:00Z\", \"source\": \"test\"}`,
    
    // Content with multiple JSON artifacts
    `{
      \"type\": \"thinking_content\",
      \"thinking_content\": \"Let me think about this\",
      \"response_content\": \"This is the real content\",
      \"metadata\": {\"source\": \"test\", \"timestamp\": \"2023-01-01T00:00:00Z\"}
    }`,
    
    // Log-like content with artifacts
    `2023-10-15T10:30:00Z INFO: Processing request
    {\"request_id\": \"abc123\", \"content\": \"Real content here\", \"status\": \"success\"}
    2023-10-15T10:30:01Z INFO: Request completed`,
    
    // Content with escaped characters
    `\"response_content\": \"This has \\\\\"escaped quotes\\\\\" and \\\\n newlines \\\\t tabs\"`,
    
    // Content with multiple embedded JSON objects
    `Processing: {\"id\": 1, \"data\": \"value1\"}
    Result: {\"id\": 2, \"data\": \"value2\", \"nested\": {\"inner\": \"value\"}}
    Final: {\"id\": 3, \"data\": \"value3\"}`,
    
    // Content with various artifacts
    `{
      "type": "Coda",
      "response_content": "This is the actual response content",
      "thinking_content": "This is internal thinking",
      "timestamp": "2023-01-01T00:00:00Z",
      "source": "user_input",
      "metadata": {
        "version": "1.0",
        "processed": false
      }
    }`,
    
    // Content with code artifacts
    `"response_content": "function example() { return \\"real content\\"; }"`,
    
    // Content with mixed artifacts and real content
    `# Meeting Notes
    Date: 2023-01-01
    
    {
      "type": "meeting_summary",
      "response_content": "Discussed project timeline and deliverables",
      "attendees": ["Alice", "Bob", "Charlie"]
    }
    
    Action items:
    - Alice: Complete design
    - Bob: Implement features
    - Charlie: Test components`,
    
    // Very messy content with many artifacts
    `{
      "response_content": "This is the real content",
      "thinking_content": "Let me analyze this request",
      "metadata": {"source": "user", "timestamp": "2023-01-01T00:00:00Z"},
      "intermediate_steps": [{"step": 1, "result": "analyzed"}],
      "raw_input": "{\\"original\\": \\"data\\"}",
      "processed_output": "cleaned data",
      "debug_info": {"level": "verbose", "details": "lots of internal data"}
    }`
  ];

  // Create variations of the samples
  for (let i = 0; i < 100; i++) { // Create 100 variations
    const baseIdx = i % samples.length;
    const variation = `${samples[baseIdx]} [Sanitization Test ${i}]`;
    testData.push(variation);
  }

  return testData;
}

// Generate test data for cleanse operation (Key Assassin)
function generateCleanseTestData(): any[] {
  const testData = [];
  
  // Different types of content to test the Key Assassin functionality
  const samples = [
    // Content with various JSON wrappers
    `{"response_content": "Actual user content here", "metadata": {"extra": "data"}}`,
    
    // Content with nested JSON
    `{
      "type": "Coda",
      "content": {
        "response_content": "This is the real content",
        "nested": {"more": "data"}
      }
    }`,
    
    // Content with multiple response_content fields
    `{
      "response_content": "First content",
      "other_field": {
        "response_content": "Second content",
        "another_response_content": "Third content"
      }
    }`,
    
    // Content with escaped JSON
    `{\"response_content\": \"Escaped content here\", \"extra\": \"data\"}`,
    
    // Content with mixed artifacts
    `Processing result:
    {
      "type": "answer",
      "response_content": "The answer is 42",
      "confidence": 0.95,
      "sources": ["doc1", "doc2"]
    }
    End of processing.`,
    
    // Content with various artifact types
    `{
      "thinking_content": "Internal thought process",
      "response_content": "Public response",
      "raw_content": "Original input",
      "processed_content": "Cleaned output"
    }`,
    
    // Content with special characters and artifacts
    `{
      "response_content": "Content with special chars: @#$%^&*()",
      "symbols": ["@", "#", "$", "%", "^", "&", "*", "(", ")"],
      "metadata": {"preserved": true}
    }`,
    
    // Content with deeply nested artifacts
    `{
      "level1": {
        "level2": {
          "level3": {
            "response_content": "Deeply nested real content",
            "internal": {"data": "should be removed"}
          }
        }
      }
    }`,
    
    // Content with multiple artifact patterns
    `{
      "response_content": "Main content",
      "thinking_content": "Internal thoughts",
      "tool_call": {"name": "search", "args": {"query": "test"}},
      "intermediate_result": "temporary data",
      "final_answer": "The actual answer"
    }`,
    
    // Very large content with artifacts
    `{
      "response_content": "` + 
      "This is a very long response content string that contains lots of meaningful information ".repeat(50) +
      `",
      "metadata": {` +
      `"field1": "value1", "field2": "value2", "field3": "value3", `.repeat(20) +
      `},
      "nested_objects": [` +
      `{"id": 1, "data": "item1"}, {"id": 2, "data": "item2"}, `.repeat(30) +
      `]
    }`
  ];

  // Create variations of the samples
  for (let i = 0; i < 80; i++) { // Create 80 variations
    const baseIdx = i % samples.length;
    const variation = samples[baseIdx].replace(/Test/g, `Sanitization Test ${i}`);
    testData.push(variation);
  }

  return testData;
}

// Run sanitization profiling
async function runSanitizationProfiling() {
  logWithContext.info('Starting content sanitization performance profiling...');
  
  try {
    // Generate test data for sanitization
    const sanitizeTestData = generateSanitizationTestData();
    logWithContext.info(`Generated ${sanitizeTestData.length} test samples for sanitization`);
    
    // Define profiling configuration for sanitization
    const sanitizeConfig: ProfilingConfig = {
      operation: 'sanitize',
      iterations: 100,
      testData: sanitizeTestData,
      parameters: {}
    };
    
    // Run the sanitization profiling
    logWithContext.info('Executing content sanitization profiling...', {
      operation: sanitizeConfig.operation,
      iterations: sanitizeConfig.iterations,
      testDataSize: sanitizeTestData.length
    });
    
    const sanitizeResult = await nativeModuleProfiler.profileOperation(sanitizeConfig);
    
    // Log the sanitization results
    logWithContext.info('Content sanitization profiling completed', {
      operation: sanitizeResult.operation,
      totalDuration: `${sanitizeResult.duration.toFixed(2)}ms`,
      avgDuration: `${sanitizeResult.avgDuration.toFixed(4)}ms per operation`,
      minDuration: `${sanitizeResult.minDuration.toFixed(4)}ms`,
      maxDuration: `${sanitizeResult.maxDuration.toFixed(4)}ms`,
      memoryDelta: `${sanitizeResult.memoryDelta.toFixed(2)}MB`,
      iterations: sanitizeResult.iterations
    });
    
    // Generate test data for cleanse (Key Assassin)
    const cleanseTestData = generateCleanseTestData();
    logWithContext.info(`Generated ${cleanseTestData.length} test samples for Key Assassin (cleanse)`);
    
    // Define profiling configuration for cleanse
    const cleanseConfig: ProfilingConfig = {
      operation: 'cleanse',
      iterations: 80,
      testData: cleanseTestData,
      parameters: {}
    };
    
    // Run the cleanse profiling
    logWithContext.info('Executing Key Assassin (cleanse) profiling...', {
      operation: cleanseConfig.operation,
      iterations: cleanseConfig.iterations,
      testDataSize: cleanseTestData.length
    });
    
    const cleanseResult = await nativeModuleProfiler.profileOperation(cleanseConfig);
    
    // Log the cleanse results
    logWithContext.info('Key Assassin (cleanse) profiling completed', {
      operation: cleanseResult.operation,
      totalDuration: `${cleanseResult.duration.toFixed(2)}ms`,
      avgDuration: `${cleanseResult.avgDuration.toFixed(4)}ms per operation`,
      minDuration: `${cleanseResult.minDuration.toFixed(4)}ms`,
      maxDuration: `${cleanseResult.maxDuration.toFixed(4)}ms`,
      memoryDelta: `${cleanseResult.memoryDelta.toFixed(2)}MB`,
      iterations: cleanseResult.iterations
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
    
    // Identify highest memory impact operations
    const highMemory = nativeModuleProfiler.getHighestMemoryImpact(3);
    if (highMemory.length > 0) {
      console.log('Highest Memory Impact Operations:');
      highMemory.forEach((op: any, idx: number) => {
        console.log(`  ${idx + 1}. ${op.operation}: ${op.memoryDelta.toFixed(2)}MB change`);
      });
    }
    
    return { sanitizeResult, cleanseResult };
  } catch (error) {
    logWithContext.error('Error during sanitization profiling', error as Error);
    throw error;
  }
}

// If this script is run directly
if (require.main === module) {
  runSanitizationProfiling()
    .then(() => {
      logWithContext.info('Content sanitization profiling script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logWithContext.error('Content sanitization profiling script failed', error);
      process.exit(1);
    });
}

export { runSanitizationProfiling };