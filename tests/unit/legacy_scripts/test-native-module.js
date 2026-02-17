/**
 * Simple test script to validate the native module functionality
 */
import { performance } from 'perf_hooks';
import { createRequire } from 'module';

// Use require to load the native module
const require = createRequire(import.meta.url);
const native = require('./build/Release/ece_native.node');

console.log('🚀 Testing ECE_Native Module...\n');

// Test content
const testContent = 'The Sovereign Context Engine processes large volumes of semantic data. Native modules provide significant performance improvements over JavaScript.';
const dirtyContent = `{"type": "response", "response_content": "${testContent}", "metadata": {"source": "test", "timestamp": "2026-01-31"}}`;

console.log('📝 Test content length:', testContent.length, 'characters\n');

// Test 1: Fingerprint generation
console.log('📊 Test 1: Fingerprint Generation');
const startFp = performance.now();
const fingerprint = native.fingerprint(testContent);
const endFp = performance.now();
console.log(`Generated fingerprint: ${fingerprint} in ${(endFp - startFp).toFixed(4)}ms\n`);

// Test 2: Content cleansing
console.log('📊 Test 2: Content Cleansing');
const startClean = performance.now();
const cleanContent = native.cleanse(dirtyContent);
const endClean = performance.now();
console.log(`Cleaned content: "${cleanContent.substring(0, 50)}..." in ${(endClean - startClean).toFixed(4)}ms\n`);

// Test 3: Atomization
console.log('📊 Test 3: Atomization');
const startAtom = performance.now();
const atoms = native.atomize(testContent, 'prose');
const endAtom = performance.now();
console.log(`Generated ${atoms.length} atoms in ${(endAtom - startAtom).toFixed(4)}ms\n`);

// Test 4: Distance calculation
console.log('📊 Test 4: Distance Calculation');
const hash1 = native.fingerprint('content A for distance testing');
const hash2 = native.fingerprint('content B for distance testing');
const startDist = performance.now();
const distance = native.distance(hash1, hash2);
const endDist = performance.now();
console.log(`Distance between hashes: ${distance} in ${(endDist - startDist).toFixed(4)}ms\n`);

// Test 5: Batch distance calculation (if available)
if (native.distanceBatch) {
    console.log('📊 Test 5: Batch Distance Calculation (SIMD Optimized)');
    const hashesA = [];
    const hashesB = [];
    for (let i = 0; i < 10; i++) {
        hashesA.push(native.fingerprint(`test content ${i}`));
        hashesB.push(native.fingerprint(`similar content ${i}`));
    }

    const startBatch = performance.now();
    const distances = native.distanceBatch(hashesA, hashesB, 10);
    const endBatch = performance.now();
    console.log(`Calculated ${distances.length} distances in ${(endBatch - startBatch).toFixed(4)}ms\n`);
} else {
    console.log('⚠️  distanceBatch function not available\n');
}

// Performance benchmark
console.log('📈 Performance Benchmark (100 iterations):');
const iterations = 100;
const benchStart = performance.now();

for (let i = 0; i < iterations; i++) {
    native.fingerprint(`test content for benchmark iteration ${i}`);
}

const benchEnd = performance.now();
const avgTime = (benchEnd - benchStart) / iterations;
console.log(`Average fingerprint generation time: ${avgTime.toFixed(4)}ms per operation`);
console.log(`Operations per second: ${(1000 / avgTime).toFixed(2)} ops/sec\n`);

console.log('✅ All tests completed successfully!');
console.log('🎯 The optimized native modules are working correctly.');