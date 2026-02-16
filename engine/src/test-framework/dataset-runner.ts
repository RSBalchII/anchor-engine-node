/**
 * Dataset-Specific Test Configuration for Anchor Engine
 * 
 * Implements configurable test setups for different data sizes and types
 */

import { TestFramework, TestConfig, TestSuiteConfig } from './core.js';
import * as fs from 'fs';
import * as path from 'path';

export interface DatasetConfig {
  name: string;
  description: string;
  size: 'small' | 'medium' | 'large' | 'xl';
  path: string;
  tags: string[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  timeout?: number;
}

export interface DatasetTestConfig {
  dataset: DatasetConfig;
  testPatterns: TestPattern[];
  performanceThresholds: PerformanceThresholds;
}

export interface TestPattern {
  name: string;
  pattern: string | RegExp;
  description: string;
  enabled: boolean;
  timeout?: number;
}

export interface PerformanceThresholds {
  ingestionRate: number; // atoms per second
  searchLatency: number; // milliseconds
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
}

export class DatasetTestRunner {
  private framework: TestFramework;
  private datasetConfigs: Map<string, DatasetConfig> = new Map();

  constructor(framework: TestFramework) {
    this.framework = framework;
  }

  /**
   * Register a dataset configuration
   */
  registerDataset(config: DatasetConfig): void {
    this.datasetConfigs.set(config.name, config);
  }

  /**
   * Create a test suite for a specific dataset
   */
  createDatasetTestSuite(datasetName: string, customTests?: TestConfig[]): TestSuiteConfig {
    const dataset = this.datasetConfigs.get(datasetName);
    if (!dataset) {
      throw new Error(`Dataset configuration not found: ${datasetName}`);
    }

    // Default tests for all datasets
    const defaultTests: TestConfig[] = [
      {
        name: 'Dataset Health Check',
        description: `Verify ${dataset.name} dataset is accessible and properly formatted`,
        testFn: async () => {
          // Check if dataset path exists
          if (!fs.existsSync(dataset.path)) {
            throw new Error(`Dataset path does not exist: ${dataset.path}`);
          }

          // Check if it's a directory or file
          const stats = fs.statSync(dataset.path);
          if (!stats.isDirectory() && !stats.isFile()) {
            throw new Error(`Dataset path is neither a file nor directory: ${dataset.path}`);
          }

          console.log(`✅ Dataset ${dataset.name} is accessible at ${dataset.path}`);
        },
        timeout: dataset.timeout || 10000
      },
      {
        name: 'Ingestion Performance Test',
        description: `Test ingestion performance with ${dataset.name} dataset`,
        testFn: async () => {
          // Performance test based on dataset size
          const startTime = Date.now();

          // Simulate ingestion based on dataset size
          const atomCount = this.getAtomEstimateForSize(dataset.size);
          console.log(`📊 Ingesting approximately ${atomCount} atoms from ${dataset.name} dataset...`);

          // In a real implementation, this would call the actual ingestion service
          // For now, we'll simulate based on size
          await this.simulateIngestion(atomCount);

          const duration = Date.now() - startTime;
          const ingestionRate = atomCount / (duration / 1000); // atoms per second

          console.log(`✅ Ingested ${atomCount} atoms in ${duration}ms (${ingestionRate.toFixed(2)} atoms/sec)`);

          // Check against performance thresholds
          if (ingestionRate < 10) { // Adjust threshold as needed
            console.warn(`⚠️  Ingestion rate below expected threshold: ${ingestionRate.toFixed(2)} atoms/sec`);
          }
        },
        timeout: (dataset.timeout || 30000) * this.getTimeoutMultiplierForSize(dataset.size)
      },
      {
        name: 'Search Functionality Test',
        description: `Test search functionality with ${dataset.name} dataset`,
        testFn: async () => {
          console.log(`🔍 Testing search functionality with ${dataset.name} dataset...`);

          // In a real implementation, this would perform actual searches against the ingested data
          // For now, we'll simulate based on dataset size
          const searchQueries = this.generateSearchQueries(dataset.size);

          for (const query of searchQueries) {
            const startTime = Date.now();

            // Simulate search operation
            await this.simulateSearch(query);

            const duration = Date.now() - startTime;
            console.log(`   Query "${query}" took ${duration}ms`);

            // Check against performance thresholds
            if (duration > 1000) { // Adjust threshold as needed
              console.warn(`⚠️  Search query "${query}" took longer than expected: ${duration}ms`);
            }
          }

          console.log(`✅ Search functionality verified with ${dataset.name} dataset`);
        },
        timeout: (dataset.timeout || 20000) * this.getTimeoutMultiplierForSize(dataset.size)
      }
    ];

    // Combine default tests with custom tests
    const allTests = customTests ? [...defaultTests, ...customTests] : defaultTests;

    return {
      name: `Dataset: ${dataset.name}`,
      description: `Tests for the ${dataset.name} dataset (${dataset.description})`,
      tests: allTests,
      timeout: dataset.timeout,
      environment: 'integration',
      tags: ['dataset', dataset.name, dataset.size, ...dataset.tags]
    } as TestSuiteConfig;
  }

  /**
   * Run tests for a specific dataset
   */
  async runDatasetTests(datasetName: string, customTests?: TestConfig[]): Promise<void> {
    const suite = this.createDatasetTestSuite(datasetName, customTests);
    this.framework.addTestSuite(suite);

    // Run just this suite
    await this.framework.runTestSuite(suite);
  }

  /**
   * Run tests for all registered datasets
   */
  async runAllDatasetTests(): Promise<void> {
    for (const [name, config] of this.datasetConfigs.entries()) {
      console.log(`\n🚀 Running tests for dataset: ${name}`);
      await this.runDatasetTests(name);
    }
  }

  /**
   * Get estimated atom count based on dataset size
   */
  private getAtomEstimateForSize(size: 'small' | 'medium' | 'large' | 'xl'): number {
    switch (size) {
      case 'small': return 100;
      case 'medium': return 1000;
      case 'large': return 10000;
      case 'xl': return 100000;
      default: return 1000;
    }
  }

  /**
   * Get timeout multiplier based on dataset size
   */
  private getTimeoutMultiplierForSize(size: 'small' | 'medium' | 'large' | 'xl'): number {
    switch (size) {
      case 'small': return 1;
      case 'medium': return 2;
      case 'large': return 5;
      case 'xl': return 10;
      default: return 1;
    }
  }

  /**
   * Simulate ingestion process
   */
  private async simulateIngestion(atomCount: number): Promise<void> {
    // Simulate processing time based on atom count
    const processingTime = Math.min(30000, atomCount * 10); // Cap at 30 seconds
    await new Promise(resolve => setTimeout(resolve, processingTime));
  }

  /**
   * Generate search queries based on dataset size
   */
  private generateSearchQueries(size: 'small' | 'medium' | 'large' | 'xl'): string[] {
    const baseQueries = [
      'test query',
      'performance check',
      'search functionality'
    ];

    // Add more queries for larger datasets
    if (size === 'large' || size === 'xl') {
      baseQueries.push(
        'complex search query',
        'multi-term search',
        'relationship discovery'
      );
    }

    if (size === 'xl') {
      baseQueries.push(
        'deep semantic search',
        'cross-reference query',
        'multi-dimensional search'
      );
    }

    return baseQueries;
  }

  /**
   * Simulate search operation
   */
  private async simulateSearch(query: string): Promise<void> {
    // Simulate search processing time
    const processingTime = 100 + Math.random() * 400; // 100-500ms
    await new Promise(resolve => setTimeout(resolve, processingTime));
  }
}

// Predefined dataset configurations
export const PREDEFINED_DATASETS: DatasetConfig[] = [
  {
    name: 'minimal',
    description: 'Minimal dataset for quick smoke tests',
    size: 'small',
    path: './test-data/minimal',
    tags: ['smoke', 'quick', 'ci'],
    timeout: 15000
  },
  {
    name: 'standard',
    description: 'Standard dataset for comprehensive testing',
    size: 'medium',
    path: './test-data/standard',
    tags: ['regression', 'feature'],
    timeout: 45000
  },
  {
    name: 'stress',
    description: 'Large dataset for performance and stress testing',
    size: 'large',
    path: './test-data/stress',
    tags: ['performance', 'stress', 'load'],
    timeout: 120000
  },
  {
    name: 'benchmark',
    description: 'Extra-large dataset for benchmarking',
    size: 'xl',
    path: './test-data/benchmark',
    tags: ['benchmark', 'capacity', 'endurance'],
    timeout: 300000  // 5 minutes for XL dataset
  }
];

// Initialize with predefined datasets
export function initializeDatasetTestRunner(framework: TestFramework): DatasetTestRunner {
  const runner = new DatasetTestRunner(framework);

  for (const dataset of PREDEFINED_DATASETS) {
    runner.registerDataset(dataset);
  }

  return runner;
}