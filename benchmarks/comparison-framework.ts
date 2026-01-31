import { BenchmarkFramework } from './framework';
import axios from 'axios';

export interface SystemComparisonConfig {
  systemName: string;
  endpoint: string;
  apiKey?: string;
  description: string;
}

export class SystemComparisonFramework {
  private benchmarkFramework: BenchmarkFramework;
  private systems: SystemComparisonConfig[] = [];
  
  constructor(baseEndpoint: string = 'http://localhost:3000') {
    this.benchmarkFramework = new BenchmarkFramework(baseEndpoint);
  }
  
  addSystem(config: SystemComparisonConfig): void {
    this.systems.push(config);
  }
  
  async compareIngestionPerformance(testDataPath: string): Promise<any[]> {
    console.log('\n⚖️  Comparing Ingestion Performance Across Systems');
    
    const results: any[] = [];
    
    for (const system of this.systems) {
      console.log(`\nTesting system: ${system.systemName}`);
      
      // Create a temporary benchmark framework for this system
      const tempFramework = new BenchmarkFramework(system.endpoint);
      
      try {
        // For systems that require API keys
        if (system.apiKey) {
          // We would need to customize the framework to handle API keys
          // This is a simplified approach
        }
        
        const result = await tempFramework.runIngestionBenchmark(testDataPath);
        results.push({
          system: system.systemName,
          ...result,
          description: system.description
        });
        
        console.log(`   ✅ ${system.systemName}: ${result.duration}ms, ${result.throughput?.toFixed(2) || 'N/A'} docs/sec`);
      } catch (error) {
        console.error(`   ❌ ${system.systemName} failed:`, error);
        results.push({
          system: system.systemName,
          error: error.message,
          description: system.description
        });
      }
    }
    
    return results;
  }
  
  async compareSearchPerformance(queries: string[]): Promise<any[]> {
    console.log('\n⚖️  Comparing Search Performance Across Systems');
    
    const results: any[] = [];
    
    for (const system of this.systems) {
      console.log(`\nTesting system: ${system.systemName}`);
      
      // Create a temporary benchmark framework for this system
      const tempFramework = new BenchmarkFramework(system.endpoint);
      
      try {
        const result = await tempFramework.runSearchBenchmark(queries);
        results.push({
          system: system.systemName,
          ...result,
          description: system.description
        });
        
        console.log(`   ✅ ${system.systemName}: ${result.duration}ms, ${result.throughput?.toFixed(2) || 'N/A'} queries/sec`);
      } catch (error) {
        console.error(`   ❌ ${system.systemName} failed:`, error);
        results.push({
          system: system.systemName,
          error: error.message,
          description: system.description
        });
      }
    }
    
    return results;
  }
  
  async runCompleteComparison(testDataPath: string, queries: string[]): Promise<any> {
    console.log('🔬 Running Complete System Comparison');
    
    // Compare ingestion performance
    const ingestionResults = await this.compareIngestionPerformance(testDataPath);
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Compare search performance
    const searchResults = await this.compareSearchPerformance(queries);
    
    // Compile final report
    const report = {
      timestamp: new Date().toISOString(),
      systems: this.systems,
      ingestionResults,
      searchResults
    };
    
    return report;
  }
  
  async generateComparisonReport(report: any, outputPath: string): Promise<void> {
    import * as fs from 'fs';
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Comparison report saved to: ${outputPath}`);
  }
}

// Example usage
if (require.main === module) {
  (async () => {
    const comparisonFramework = new SystemComparisonFramework();
    
    // Add ECE_Core (local instance)
    comparisonFramework.addSystem({
      systemName: 'ECE_Core_Local',
      endpoint: 'http://localhost:3000',
      description: 'Local ECE_Core instance with semantic shift architecture'
    });
    
    // Add a mock Vertex-style system for comparison
    // In a real scenario, you would add actual endpoints for systems like Vertex AI
    comparisonFramework.addSystem({
      systemName: 'Vertex_Embed_RAG_Mock',
      endpoint: 'http://mock-vertex-endpoint', // This would be replaced with actual endpoint
      description: 'Mock of Vertex AI Embedding and RAG system for comparison'
    });
    
    // For now, we'll just run a local comparison
    // Generate test data
    const testData = [];
    for (let i = 0; i < 10; i++) {
      testData.push({
        content: `Test document ${i} for benchmarking. This contains sample content to measure ingestion performance.`,
        source: `source_${i}`,
        type: 'test'
      });
    }
    
    import * as fs from 'fs';
    const testDataPath = './temp-test-data.json';
    fs.writeFileSync(testDataPath, JSON.stringify(testData));
    
    try {
      const queries = [
        'test document',
        'performance benchmark',
        'system performance'
      ];
      
      const report = await comparisonFramework.runCompleteComparison(testDataPath, queries);
      await comparisonFramework.generateComparisonReport(report, './comparison-report.json');
      
      // Clean up
      if (fs.existsSync(testDataPath)) {
        fs.unlinkSync(testDataPath);
      }
    } catch (error) {
      console.error('Comparison failed:', error);
    }
  })();
}