import { BenchmarkFramework } from './framework';
import { runIngestionBenchmark } from './ingestion-benchmark';
import { runSearchBenchmark } from './search-benchmark';
import * as fs from 'fs';

async function runAllBenchmarks() {
  console.log('🚀 Starting ECE_Core Performance Benchmark Suite\n');
  
  const framework = new BenchmarkFramework();
  
  // Run ingestion benchmarks for different sizes
  const sizes: ('small' | 'medium' | 'large' | 'xl')[] = ['small'];
  
  for (const size of sizes) {
    await runIngestionBenchmark(framework, size);
  }
  
  // Wait a moment for the system to settle
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Run search benchmarks
  await runSearchBenchmark(framework);
  
  // Generate report
  const outputPath = './benchmark-results.json';
  await framework.generateReport(outputPath);
  
  console.log(`\n📋 Benchmark report saved to: ${outputPath}`);
  
  // Print summary
  const results = framework.getResults();
  console.log('\n📈 Benchmark Summary:');
  for (const result of results) {
    console.log(`   ${result.testName}: ${result.duration}ms, ${result.throughput?.toFixed(2) || 'N/A'} ops/sec`);
  }
}

// If this file is run directly
if (require.main === module) {
  runAllBenchmarks()
    .then(() => {
      console.log('\n✅ All benchmarks completed successfully!');
    })
    .catch(error => {
      console.error('\n❌ Benchmark execution failed:', error);
      process.exit(1);
    });
}

export { runAllBenchmarks };