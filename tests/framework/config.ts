/**
 * Test Configuration System for ECE_Core
 * 
 * Manages test configurations, environments, and dataset-specific settings
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TestConfig {
  environment: {
    baseUrl: string;
    timeout: number;
    retries: number;
    parallel: boolean;
    maxWorkers: number;
  };
  datasets: DatasetConfig[];
  reporters: ReporterConfig[];
  filters: {
    includeTags?: string[];
    excludeTags?: string[];
    testNamePattern?: string;
  };
  coverage: {
    enabled: boolean;
    include: string[];
    exclude: string[];
    thresholds: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
  };
}

export interface DatasetConfig {
  name: string;
  description: string;
  path: string;
  size: 'small' | 'medium' | 'large' | 'xl';
  tags: string[];
  setup?: string; // Script to run before tests
  teardown?: string; // Script to run after tests
}

export interface ReporterConfig {
  type: 'console' | 'json' | 'junit' | 'html';
  outputFile?: string;
  options?: Record<string, any>;
}

export class TestConfigManager {
  private static instance: TestConfigManager;
  private config: TestConfig;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'test-config.json');
    this.config = this.loadConfig();
  }

  public static getInstance(): TestConfigManager {
    if (!TestConfigManager.instance) {
      TestConfigManager.instance = new TestConfigManager();
    }
    return TestConfigManager.instance;
  }

  /**
   * Load configuration from file or use defaults
   */
  private loadConfig(): TestConfig {
    if (fs.existsSync(this.configPath)) {
      try {
        const configContent = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(configContent);
      } catch (error) {
        console.warn(`Failed to parse config file: ${error.message}. Using defaults.`);
      }
    }

    // Return default configuration
    return this.getDefaultConfig();
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): TestConfig {
    return {
      environment: {
        baseUrl: process.env.ECE_URL || 'http://localhost:3000',
        timeout: 30000, // 30 seconds
        retries: 2,
        parallel: true,
        maxWorkers: 4
      },
      datasets: [
        {
          name: 'minimal',
          description: 'Minimal dataset for quick smoke tests',
          path: './test-data/minimal',
          size: 'small',
          tags: ['smoke', 'quick']
        },
        {
          name: 'standard',
          description: 'Standard dataset for comprehensive testing',
          path: './test-data/standard',
          size: 'medium',
          tags: ['regression', 'feature']
        },
        {
          name: 'stress',
          description: 'Large dataset for performance and stress testing',
          path: './test-data/stress',
          size: 'xl',
          tags: ['performance', 'stress']
        }
      ],
      reporters: [
        { type: 'console' },
        { type: 'json', outputFile: 'test-results.json' },
        { type: 'junit', outputFile: 'test-results.xml' }
      ],
      filters: {
        includeTags: [],
        excludeTags: ['experimental', 'broken'],
        testNamePattern: '.*'
      },
      coverage: {
        enabled: false,
        include: ['src/**/*.{ts,js}'],
        exclude: ['**/node_modules/**', '**/test/**', '**/tests/**', '**/spec/**'],
        thresholds: {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80
        }
      }
    };
  }

  /**
   * Get the current configuration
   */
  getConfig(): TestConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TestConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get datasets by tag
   */
  getDatasetsByTag(tag: string): DatasetConfig[] {
    return this.config.datasets.filter(dataset => dataset.tags.includes(tag));
  }

  /**
   * Get dataset by name
   */
  getDatasetByName(name: string): DatasetConfig | undefined {
    return this.config.datasets.find(dataset => dataset.name === name);
  }

  /**
   * Save configuration to file
   */
  saveConfig(): void {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate environment settings
    if (!this.config.environment.baseUrl) {
      errors.push('baseUrl is required in environment settings');
    }

    if (this.config.environment.timeout <= 0) {
      errors.push('timeout must be greater than 0');
    }

    if (this.config.environment.retries < 0) {
      errors.push('retries must be 0 or greater');
    }

    if (this.config.environment.maxWorkers <= 0) {
      errors.push('maxWorkers must be greater than 0');
    }

    // Validate datasets
    for (const dataset of this.config.datasets) {
      if (!dataset.name) {
        errors.push('Each dataset must have a name');
      }
      if (!dataset.path) {
        errors.push(`Dataset ${dataset.name} must have a path`);
      }
      if (!['small', 'medium', 'large', 'xl'].includes(dataset.size)) {
        errors.push(`Dataset ${dataset.name} has invalid size: ${dataset.size}`);
      }
    }

    // Validate reporters
    for (const reporter of this.config.reporters) {
      if (!['console', 'json', 'junit', 'html'].includes(reporter.type)) {
        errors.push(`Invalid reporter type: ${reporter.type}`);
      }
    }

    // Validate coverage thresholds
    if (this.config.coverage.enabled) {
      const thresholds = this.config.coverage.thresholds;
      if (thresholds.statements < 0 || thresholds.statements > 100) {
        errors.push('statements threshold must be between 0 and 100');
      }
      if (thresholds.branches < 0 || thresholds.branches > 100) {
        errors.push('branches threshold must be between 0 and 100');
      }
      if (thresholds.functions < 0 || thresholds.functions > 100) {
        errors.push('functions threshold must be between 0 and 100');
      }
      if (thresholds.lines < 0 || thresholds.lines > 100) {
        errors.push('lines threshold must be between 0 and 100');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a dataset-specific configuration
   */
  createDatasetConfig(datasetName: string): TestConfig {
    const dataset = this.getDatasetByName(datasetName);
    if (!dataset) {
      throw new Error(`Dataset not found: ${datasetName}`);
    }

    // Create a config based on the main config but adapted for this dataset
    const datasetConfig: TestConfig = JSON.parse(JSON.stringify(this.config));

    // Adjust timeouts based on dataset size
    switch (dataset.size) {
      case 'small':
        datasetConfig.environment.timeout = Math.max(5000, datasetConfig.environment.timeout * 0.5);
        break;
      case 'medium':
        // Keep default timeout
        break;
      case 'large':
        datasetConfig.environment.timeout = datasetConfig.environment.timeout * 1.5;
        break;
      case 'xl':
        datasetConfig.environment.timeout = datasetConfig.environment.timeout * 2;
        break;
    }

    // Add dataset-specific tags to filters
    if (!datasetConfig.filters.includeTags) {
      datasetConfig.filters.includeTags = [];
    }
    datasetConfig.filters.includeTags.push(...dataset.tags);

    return datasetConfig;
  }
}

// Export singleton instance
export const testConfigManager = TestConfigManager.getInstance();