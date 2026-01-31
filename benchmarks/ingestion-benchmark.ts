import { BenchmarkFramework } from './framework';
import * as fs from 'fs';
import * as path from 'path';

// Sample test data generator
function generateTestData(size: 'small' | 'medium' | 'large' | 'xl'): any {
  const sizes = {
    small: 10,   // 10 documents
    medium: 100, // 100 documents
    large: 1000, // 1000 documents
    xl: 10000    // 10000 documents
  };

  const count = sizes[size];
  const data = [];

  for (let i = 0; i < count; i++) {
    data.push({
      id: `test_doc_${i}`,
      content: `This is test document number ${i} for benchmarking purposes. It contains sample text to measure ingestion performance. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.${i % 10 === 0 ? ' This sentence is added periodically to vary the content slightly.'}`,
      source: `test_source_${i % 5}`, // 5 different sources
      type: i % 2 === 0 ? 'prose' : 'code', // Mix of prose and code
      tags: [`#test`, `#benchmark_${i % 3}`, `#category_${i % 7}`]
    });
  }

  return data;
}

export async function runIngestionBenchmark(benchmarkFramework: BenchmarkFramework, size: 'small' | 'medium' | 'large' | 'xl' = 'small'): Promise<void> {
  console.log(`\n🚀 Starting Ingestion Benchmark - Size: ${size.toUpperCase()}`);
  
  // Generate test data
  const testData = generateTestData(size);
  const testDataPath = path.join(__dirname, `test-data-${size}.json`);
  fs.writeFileSync(testDataPath, JSON.stringify(testData, null, 2));
  
  console.log(`📊 Generated ${testData.length} test documents for ${size} test`);
  
  // Run ingestion benchmark
  const result = await benchmarkFramework.runIngestionBenchmark(testDataPath);
  
  // Print results
  console.log(`✅ Ingestion Benchmark Results:`);
  console.log(`   Duration: ${result.duration}ms`);
  console.log(`   Throughput: ${result.throughput?.toFixed(2)} docs/sec`);
  console.log(`   Memory Used: ${result.memoryUsed?.toFixed(2)} MB`);
  console.log(`   Errors: ${result.errors || 0}`);
  
  // Clean up
  if (fs.existsSync(testDataPath)) {
    fs.unlinkSync(testDataPath);
  }
}

// If this file is run directly
if (require.main === module) {
  (async () => {
    const framework = new BenchmarkFramework();
    await runIngestionBenchmark(framework, 'small');
  })();
}