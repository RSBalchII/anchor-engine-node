import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const execAsync = promisify(exec);

export interface BenchmarkResult {
  testName: string;
  duration: number; // in milliseconds
  throughput?: number; // operations per second
  memoryUsed?: number; // in MB
  cpuUsed?: number; // percentage
  errors?: number;
  details?: any;
}

export interface BenchmarkConfig {
  testName: string;
  iterations: number;
  warmupRuns: number;
  testDataSize: 'small' | 'medium' | 'large' | 'xl';
  endpoint: string;
}

export class BenchmarkFramework {
  private results: BenchmarkResult[] = [];
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
    console.log(`Starting benchmark: ${config.testName}`);
    
    // Warmup runs
    for (let i = 0; i < config.warmupRuns; i++) {
      await this.executeTest(config);
    }
    
    // Measure memory before test
    const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;
    
    const startTime = Date.now();
    
    // Actual test runs
    let errors = 0;
    for (let i = 0; i < config.iterations; i++) {
      try {
        await this.executeTest(config);
      } catch (error) {
        errors++;
        console.error(`Test iteration ${i} failed:`, error);
      }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Measure memory after test
    const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
    const memoryUsed = memoryAfter - memoryBefore;
    
    const result: BenchmarkResult = {
      testName: config.testName,
      duration,
      throughput: (config.iterations * 1000) / duration, // ops/sec
      memoryUsed: memoryUsed,
      errors,
    };
    
    this.results.push(result);
    console.log(`Completed benchmark: ${config.testName} in ${duration}ms`);
    
    return result;
  }

  private async executeTest(config: BenchmarkConfig): Promise<any> {
    // This method should be overridden by specific test implementations
    // For now, we'll implement a basic HTTP request test
    const response = await axios.get(`${this.baseUrl}${config.endpoint}`);
    return response.data;
  }

  async runIngestionBenchmark(testDataPath: string): Promise<BenchmarkResult> {
    const config: BenchmarkConfig = {
      testName: 'Ingestion Performance Test',
      iterations: 10,
      warmupRuns: 2,
      testDataSize: 'small',
      endpoint: '/v1/ingest'
    };

    // Read test data
    const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
    
    const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;
    const startTime = Date.now();
    
    let errors = 0;
    for (let i = 0; i < config.iterations; i++) {
      try {
        await axios.post(`${this.baseUrl}${config.endpoint}`, {
          content: testData.content || 'Test content for benchmarking',
          source: 'benchmark',
          type: 'test',
          bucket: 'benchmark'
        });
      } catch (error) {
        errors++;
        console.error(`Ingestion test iteration ${i} failed:`, error);
      }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
    const memoryUsed = memoryAfter - memoryBefore;

    const result: BenchmarkResult = {
      testName: 'Ingestion Performance',
      duration,
      throughput: (config.iterations * 1000) / duration,
      memoryUsed,
      errors
    };

    this.results.push(result);
    return result;
  }

  async runSearchBenchmark(queries: string[]): Promise<BenchmarkResult> {
    const config: BenchmarkConfig = {
      testName: 'Search Performance Test',
      iterations: queries.length,
      warmupRuns: 2,
      testDataSize: 'small',
      endpoint: '/v1/memory/search'
    };

    const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;
    const startTime = Date.now();
    
    let errors = 0;
    for (const query of queries) {
      try {
        await axios.post(`${this.baseUrl}${config.endpoint}`, {
          query: query,
          max_chars: 20000
        });
      } catch (error) {
        errors++;
        console.error(`Search test for query "${query}" failed:`, error);
      }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
    const memoryUsed = memoryAfter - memoryBefore;

    const result: BenchmarkResult = {
      testName: 'Search Performance',
      duration,
      throughput: (queries.length * 1000) / duration,
      memoryUsed,
      errors
    };

    this.results.push(result);
    return result;
  }

  getResults(): BenchmarkResult[] {
    return this.results;
  }

  async generateReport(outputPath: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memory: process.memoryUsage()
      },
      results: this.results
    };

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Benchmark report generated: ${outputPath}`);
  }

  reset(): void {
    this.results = [];
  }
}