/**
 * SimHash Computation Performance Profiling Script
 * 
 * Profiles the performance of SimHash computation in native modules
 */

import { nativeModuleProfiler, ProfilingConfig } from '../utils/native-module-profiler.js';
import { logWithContext } from '../utils/structured-logger.js';

// Generate test data for SimHash profiling
function generateSimHashTestData(): any[] {
  const testData = [];
  
  // Different types of content to test SimHash performance
  const samples = [
    // Short strings
    "test",
    "hello world",
    "simhash computation",
    
    // Medium strings
    "The quick brown fox jumps over the lazy dog. This is a medium length string for testing.",
    "SimHash is a technique for quickly finding duplicates in large datasets. It creates a fingerprint of the content.",
    
    // Longer strings
    "The Sovereign Context Engine uses SimHash for detecting near-duplicate content. This helps in reducing noise and improving retrieval quality. The algorithm creates a compact fingerprint of the content that can be compared efficiently.",
    
    // Technical content
    "function calculateSimHash(content) { const tokens = tokenize(content); const shingles = createShingles(tokens); return computeFingerprint(shingles); }",
    
    // Mixed content with special characters
    "JSON data: {\"key\": \"value\", \"nested\": {\"array\": [1, 2, 3]}} and some text with symbols: @#$%^&*()",
    
    // Repetitive content (should have similar SimHashes)
    "This is repetitive content. This is repetitive content. This is repetitive content.",
    "This is also repetitive. This is also repetitive. This is also repetitive.",
    
    // Unique content
    "Unique content that should have a different SimHash fingerprint from other entries in this test suite.",
    "Another unique string with completely different content to test the diversity of the SimHash algorithm.",
    
    // Very long content
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. " +
    "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem."
  ];

  // Create variations of the samples
  for (let i = 0; i < 100; i++) { // Create 100 variations
    const baseIdx = i % samples.length;
    const variation = `${samples[baseIdx]} [Run ${i}]`;
    testData.push(variation);
  }

  return testData;
}

// Generate test data for distance calculation
async function generateDistanceTestData(): Promise<any[]> {
  const testData = [];
  const { nativeModuleManager } = await import('../utils/native-module-manager.js');
  const nativeModule = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node');

  // Create some fingerprints using the native module if available
  if (nativeModule && typeof nativeModule.fingerprint === 'function') {
    for (let i = 0; i < 50; i++) {
      const text1 = `Sample text for fingerprinting ${i}`;
      const text2 = `Similar sample text for fingerprinting ${i}`;

      testData.push({
        a: nativeModule.fingerprint ? nativeModule.fingerprint(text1) : `fp_${i}_a`,
        b: nativeModule.fingerprint ? nativeModule.fingerprint(text2) : `fp_${i}_b`
      });
    }
  } else {
    // Fallback with dummy fingerprints
    for (let i = 0; i < 50; i++) {
      testData.push({
        a: `fingerprint_a_${i}`,
        b: `fingerprint_b_${i}`
      });
    }
  }

  return testData;
}

// Run SimHash profiling
async function runSimHashProfiling() {
  logWithContext.info('Starting SimHash computation performance profiling...');
  
  try {
    // Generate test data for fingerprinting
    const fingerprintTestData = generateSimHashTestData();
    logWithContext.info(`Generated ${fingerprintTestData.length} test samples for SimHash fingerprinting`);
    
    // Define profiling configuration for fingerprinting
    const fingerprintConfig: ProfilingConfig = {
      operation: 'fingerprint',
      iterations: 100,
      testData: fingerprintTestData,
      parameters: {}
    };
    
    // Run the fingerprinting profiling
    logWithContext.info('Executing SimHash fingerprinting profiling...', {
      operation: fingerprintConfig.operation,
      iterations: fingerprintConfig.iterations,
      testDataSize: fingerprintTestData.length
    });
    
    const fingerprintResult = await nativeModuleProfiler.profileOperation(fingerprintConfig);
    
    // Log the fingerprinting results
    logWithContext.info('SimHash fingerprinting profiling completed', {
      operation: fingerprintResult.operation,
      totalDuration: `${fingerprintResult.duration.toFixed(2)}ms`,
      avgDuration: `${fingerprintResult.avgDuration.toFixed(4)}ms per operation`,
      minDuration: `${fingerprintResult.minDuration.toFixed(4)}ms`,
      maxDuration: `${fingerprintResult.maxDuration.toFixed(4)}ms`,
      memoryDelta: `${fingerprintResult.memoryDelta.toFixed(2)}MB`,
      iterations: fingerprintResult.iterations
    });
    
    // Generate test data for distance calculation
    const distanceTestData = await generateDistanceTestData();
    logWithContext.info(`Generated ${distanceTestData.length} test samples for distance calculation`);

    // Define profiling configuration for distance calculation
    const distanceConfig: ProfilingConfig = {
      operation: 'distance',
      iterations: 50,
      testData: distanceTestData,
      parameters: {}
    };

    // Run the distance calculation profiling
    logWithContext.info('Executing SimHash distance calculation profiling...', {
      operation: distanceConfig.operation,
      iterations: distanceConfig.iterations,
      testDataSize: distanceTestData.length
    });
    
    const distanceResult = await nativeModuleProfiler.profileOperation(distanceConfig);
    
    // Log the distance calculation results
    logWithContext.info('SimHash distance calculation profiling completed', {
      operation: distanceResult.operation,
      totalDuration: `${distanceResult.duration.toFixed(2)}ms`,
      avgDuration: `${distanceResult.avgDuration.toFixed(4)}ms per operation`,
      minDuration: `${distanceResult.minDuration.toFixed(4)}ms`,
      maxDuration: `${distanceResult.maxDuration.toFixed(4)}ms`,
      memoryDelta: `${distanceResult.memoryDelta.toFixed(2)}MB`,
      iterations: distanceResult.iterations
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
    
    return { fingerprintResult, distanceResult };
  } catch (error) {
    logWithContext.error('Error during SimHash profiling', error as Error);
    throw error;
  }
}

// If this script is run directly
if (require.main === module) {
  runSimHashProfiling()
    .then(() => {
      logWithContext.info('SimHash profiling script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logWithContext.error('SimHash profiling script failed', error);
      process.exit(1);
    });
}

export { runSimHashProfiling };