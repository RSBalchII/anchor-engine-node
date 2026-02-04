/**
 * Performance Benchmark for ECE_Native Optimized Modules
 * 
 * Tests the performance improvements from the optimization stack:
 * - Zero-copy string operations
 * - SIMD-accelerated distance calculations
 * - RE2-optimized regex processing
 */

import { performance } from 'perf_hooks';
import { nativeModuleManager } from './utils/native-module-manager.js';

// Get the native module
const native = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node');

// Generate test data
function generateTestContent(size: number): string {
  const sentences = [
    "The Sovereign Context Engine processes large volumes of semantic data.",
    "Native modules provide significant performance improvements over JavaScript.",
    "SimHash enables efficient deduplication of similar content.",
    "Zero-copy operations reduce memory allocation overhead.",
    "AVX2 SIMD instructions accelerate batch computations.",
    "RE2 provides deterministic regex processing without backtracking.",
    "The Tag-Walker protocol enables associative retrieval.",
    "Atomic architecture breaks content into semantic molecules.",
    "Performance optimizations improve throughput and reduce latency.",
    "Cross-platform compatibility ensures consistent behavior."
  ];
  
  let content = '';
  for (let i = 0; i < size; i++) {
    content += sentences[i % sentences.length] + ' ';
  }
  return content;
}

function generateTestHashes(count: number): number[] {
  const hashes = [];
  for (let i = 0; i < count; i++) {
    // Generate pseudo-random but realistic hash values
    hashes.push(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
  }
  return hashes;
}

// Performance test function
function runBenchmark(name: string, testFn: () => any, iterations: number = 100): number {
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    testFn();
  }
  
  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  
  console.log(`${name}: ${iterations} iterations took ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(4)}ms per call)`);
  return avgTime;
}

// Run benchmarks
async function runBenchmarks() {
  console.log('🚀 Starting ECE_Native Performance Benchmarks...\n');

  // Test content generation
  const largeContent = generateTestContent(1000); // ~10KB
  const mediumContent = generateTestContent(100); // ~1KB
  const smallContent = generateTestContent(10);  // ~100B
  
  console.log(`📝 Generated test content: Small (${smallContent.length}B), Medium (${mediumContent.length}B), Large (${largeContent.length}B)\n`);

  // Benchmark 1: Fingerprint generation
  console.log('📊 Benchmark 1: Fingerprint Generation');
  runBenchmark('Small content fingerprint', () => native.fingerprint(smallContent), 500);
  runBenchmark('Medium content fingerprint', () => native.fingerprint(mediumContent), 100);
  runBenchmark('Large content fingerprint', () => native.fingerprint(largeContent), 20);
  console.log('');

  // Benchmark 2: Content cleansing
  const dirtyContent = `{"type": "response", "response_content": "${mediumContent}", "metadata": {"source": "test", "timestamp": "2026-01-31"}}`;
  console.log('📊 Benchmark 2: Content Cleansing');
  runBenchmark('Cleanse JSON wrapper', () => native.cleanse(dirtyContent), 1000);
  console.log('');

  // Benchmark 3: Atomization
  console.log('📊 Benchmark 3: Atomization');
  runBenchmark('Atomize prose (small)', () => native.atomize(smallContent, 'prose'), 100);
  runBenchmark('Atomize prose (medium)', () => native.atomize(mediumContent, 'prose'), 50);
  console.log('');

  // Benchmark 4: Distance calculations
  const hash1 = native.fingerprint('content A for distance testing');
  const hash2 = native.fingerprint('content B for distance testing');
  console.log('📊 Benchmark 4: Distance Calculations');
  runBenchmark('Single distance calculation', () => native.distance(hash1, hash2), 10000);
  console.log('');

  // Benchmark 5: Batch distance calculations (SIMD optimized)
  console.log('📊 Benchmark 5: Batch Distance Calculations (SIMD Optimized)');
  const hashesA = generateTestHashes(100);
  const hashesB = generateTestHashes(100);
  
  // Test the new batch function if available
  if (native.distanceBatch) {
    runBenchmark('Batch distance (100 pairs)', () => {
      native.distanceBatch(hashesA, hashesB, 100);
    }, 100);
    
    // Test with larger batch
    const largeHashesA = generateTestHashes(1000);
    const largeHashesB = generateTestHashes(1000);
    runBenchmark('Batch distance (1000 pairs)', () => {
      native.distanceBatch(largeHashesA, largeHashesB, 1000);
    }, 10);
  } else {
    console.log('⚠️  distanceBatch function not available - SIMD optimization may not be compiled');
  }
  console.log('');

  // Benchmark 6: Combined operations (realistic workload)
  console.log('📊 Benchmark 6: Combined Operations (Realistic Workload)');
  runBenchmark('Full pipeline (cleanse->fingerprint)', () => {
    const clean = native.cleanse(dirtyContent);
    const fp = native.fingerprint(clean);
    return fp;
  }, 100);
  console.log('');

  console.log('✅ Performance benchmarks completed!');
  
  // Calculate throughput estimates
  console.log('\n📈 Estimated Throughput:');
  console.log(`- Fingerprint generation: ${(1000 / runBenchmark('', () => native.fingerprint(smallContent), 500)).toFixed(0)} fps (small content)`);
  console.log(`- Content cleansing: ${(1000 / runBenchmark('', () => native.cleanse(dirtyContent), 1000)).toFixed(0)} ops/sec`);
  console.log(`- Distance calculations: ${(1000 / runBenchmark('', () => native.distance(hash1, hash2), 10000)).toFixed(0)} ops/sec`);
  
  if (native.distanceBatch) {
    console.log(`- Batch distances: ${(1000 / runBenchmark('', () => native.distanceBatch(hashesA, hashesB, 100), 100)).toFixed(0)} batches/sec (100 pairs each)`);
  }
}

// Run the benchmarks
runBenchmarks().catch(console.error);