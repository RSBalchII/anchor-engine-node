import { BenchmarkFramework } from './framework';

export async function runSearchBenchmark(benchmarkFramework: BenchmarkFramework): Promise<void> {
  console.log('\n🔍 Starting Search Benchmark');
  
  // Define various search queries to test different scenarios
  const queries = [
    // Simple keyword search
    'test',
    'benchmark',
    'performance',
    
    // Multi-word search
    'test document',
    'performance benchmark',
    'ingestion performance',
    
    // Semantic search patterns
    'how does the system work',
    'what is the performance like',
    'tell me about benchmarks',
    
    // Complex queries
    'test AND performance',
    'benchmark OR performance',
    'system performance metrics'
  ];
  
  console.log(`📊 Running ${queries.length} search queries`);
  
  // Run search benchmark
  const result = await benchmarkFramework.runSearchBenchmark(queries);
  
  // Print results
  console.log(`✅ Search Benchmark Results:`);
  console.log(`   Duration: ${result.duration}ms`);
  console.log(`   Throughput: ${result.throughput?.toFixed(2)} queries/sec`);
  console.log(`   Memory Used: ${result.memoryUsed?.toFixed(2)} MB`);
  console.log(`   Errors: ${result.errors || 0}`);
}

// If this file is run directly
if (require.main === module) {
  (async () => {
    const framework = new BenchmarkFramework();
    await runSearchBenchmark(framework);
  })();
}