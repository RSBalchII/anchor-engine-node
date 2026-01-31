/**
 * Centralized Test Framework for ECE_Core
 * 
 * Implements a comprehensive testing framework with support for:
 * - Unit tests
 * - Integration tests  
 * - Performance tests
 * - Dataset-specific tests
 * - Diagnostic tests
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number; // in milliseconds
  error?: Error;
  details?: any;
}

export interface TestConfig {
  name: string;
  description: string;
  testFn: () => Promise<void> | void;
  timeout?: number;
  tags?: string[];
  dependencies?: string[];
  skip?: boolean;
  only?: boolean; // Only run this test (for debugging)
}

export interface TestSuiteConfig {
  name: string;
  description: string;
  tests: TestConfig[];
  timeout?: number;
  environment?: 'node' | 'browser' | 'integration' | string; // Allow string for flexibility
  tags?: string[];
}

export interface TestReport {
  suiteName: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in milliseconds
  results: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
  coverage?: TestCoverage;
}

export interface TestCoverage {
  files: number;
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export class TestFramework {
  private testSuites: TestSuiteConfig[] = [];
  private reporters: Reporter[] = [];
  private globalTimeout: number = 30000; // 30 seconds default
  private bailMode: boolean = false; // Stop on first failure
  private verbose: boolean = false;

  constructor(options: { timeout?: number; bailMode?: boolean; verbose?: boolean } = {}) {
    this.globalTimeout = options.timeout || this.globalTimeout;
    this.bailMode = options.bailMode || this.bailMode;
    this.verbose = options.verbose || this.verbose;
  }

  /**
   * Register a test suite
   */
  addTestSuite(suite: TestSuiteConfig): void {
    this.testSuites.push(suite);
  }

  /**
   * Add a reporter for test results
   */
  addReporter(reporter: Reporter): void {
    this.reporters.push(reporter);
  }

  /**
   * Run all registered test suites
   */
  async runAll(): Promise<TestReport[]> {
    const reports: TestReport[] = [];

    for (const suite of this.testSuites) {
      const report = await this.runTestSuite(suite);
      reports.push(report);

      // Bail if bail mode is enabled and there was a failure
      if (this.bailMode && report.failed > 0) {
        break;
      }
    }

    // Generate reports
    for (const reporter of this.reporters) {
      await reporter.generate(reports);
    }

    return reports;
  }

  /**
   * Run a specific test suite
   */
  async runTestSuite(suite: TestSuiteConfig): Promise<TestReport> {
    const startTime = new Date();
    const results: TestResult[] = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    console.log(`\n🧪 Running Test Suite: ${suite.name}`);
    console.log(`📝 ${suite.description}`);
    console.log(`📊 Tests: ${suite.tests.length}`);

    // Filter tests based on 'only' flag
    const testsToRun = suite.tests.filter(test => !test.only) || suite.tests.filter(test => test.only);

    for (const testCase of testsToRun) {
      if (testCase.skip) {
        skipped++;
        results.push({
          name: testCase.name,
          status: 'SKIP',
          duration: 0,
          details: { description: testCase.description }
        });
        continue;
      }

      const result = await this.runTestCase(testCase, suite.timeout || this.globalTimeout);
      results.push(result);

      if (result.status === 'PASS') {
        passed++;
      } else if (result.status === 'FAIL') {
        failed++;
        if (this.bailMode) {
          break;
        }
      }

      // Log result
      const statusSymbol = result.status === 'PASS' ? '✅' : result.status === 'SKIP' ? '⏭️' : '❌';
      console.log(`  ${statusSymbol} ${testCase.name} (${result.duration}ms)`);
      
      if (result.error && this.verbose) {
        console.log(`     Error: ${result.error.message}`);
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    const report: TestReport = {
      suiteName: suite.name,
      startTime,
      endTime,
      duration,
      results,
      passed,
      failed,
      skipped
    };

    return report;
  }

  /**
   * Run a single test case
   */
  async runTestCase(testCase: TestConfig, timeout: number): Promise<TestResult> {
    const startTime = Date.now();
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // Set up timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Test timeout after ${timeout}ms`));
        }, timeout);
      });

      // Run the test with timeout protection
      const testPromise = Promise.resolve(testCase.testFn());
      const result = await Promise.race([testPromise, timeoutPromise]);

      // Clear timeout if test completed successfully
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      return {
        name: testCase.name,
        status: 'PASS',
        duration: Date.now() - startTime,
        details: { description: testCase.description }
      };
    } catch (error) {
      // Clear timeout if test failed
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      return {
        name: testCase.name,
        status: 'FAIL',
        duration: Date.now() - startTime,
        error: error as Error,
        details: { description: testCase.description }
      };
    }
  }

  /**
   * Run tests matching specific tags
   */
  async runTestsByTag(tag: string): Promise<TestReport[]> {
    const filteredSuites = this.testSuites.map(suite => ({
      ...suite,
      tests: suite.tests.filter(test => test.tags?.includes(tag))
    })).filter(suite => suite.tests.length > 0);

    const originalSuites = this.testSuites;
    this.testSuites = filteredSuites;

    try {
      return await this.runAll();
    } finally {
      // Restore original suites
      this.testSuites = originalSuites;
    }
  }

  /**
   * Run tests matching a specific pattern
   */
  async runTestsByName(pattern: string): Promise<TestReport[]> {
    const filteredSuites = this.testSuites.map(suite => ({
      ...suite,
      tests: suite.tests.filter(test => test.name.includes(pattern))
    })).filter(suite => suite.tests.length > 0);

    const originalSuites = this.testSuites;
    this.testSuites = filteredSuites;

    try {
      return await this.runAll();
    } finally {
      // Restore original suites
      this.testSuites = originalSuites;
    }
  }

  /**
   * Get test statistics
   */
  getStats(): { suites: number; tests: number; passed: number; failed: number; skipped: number } {
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const suite of this.testSuites) {
      totalTests += suite.tests.length;
      totalSkipped += suite.tests.filter(t => t.skip).length;
    }

    return {
      suites: this.testSuites.length,
      tests: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped
    };
  }
}

/**
 * Base reporter interface
 */
export interface Reporter {
  generate(reports: TestReport[]): Promise<void>;
}

/**
 * Console reporter
 */
export class ConsoleReporter implements Reporter {
  async generate(reports: TestReport[]): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('TEST REPORT');
    console.log('='.repeat(60));

    for (const report of reports) {
      console.log(`\nSuite: ${report.suiteName}`);
      console.log(`Duration: ${report.duration}ms`);
      console.log(`Passed: ${report.passed}, Failed: ${report.failed}, Skipped: ${report.skipped}`);

      // Show failed tests
      const failedTests = report.results.filter(r => r.status === 'FAIL');
      if (failedTests.length > 0) {
        console.log('\nFailed Tests:');
        for (const test of failedTests) {
          console.log(`  ❌ ${test.name}`);
          if (test.error) {
            console.log(`     ${test.error.message}`);
          }
        }
      }
    }

    // Overall summary
    const totalPassed = reports.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = reports.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = reports.reduce((sum, r) => sum + r.skipped, 0);
    const totalTests = totalPassed + totalFailed + totalSkipped;

    console.log('\n' + '='.repeat(60));
    console.log(`TOTAL: ${totalTests} tests (${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped)`);
    console.log('='.repeat(60));

    if (totalFailed > 0) {
      console.log('❌ Some tests failed');
      process.exit(1);
    } else {
      console.log('✅ All tests passed');
      process.exit(0);
    }
  }
}

/**
 * JSON reporter
 */
export class JSONReporter implements Reporter {
  constructor(private outputFile: string = 'test-report.json') {}

  async generate(reports: TestReport[]): Promise<void> {
    const reportData = {
      timestamp: new Date().toISOString(),
      reports,
      summary: {
        totalSuites: reports.length,
        totalTests: reports.reduce((sum, r) => r.results.length, 0),
        totalPassed: reports.reduce((sum, r) => sum + r.passed, 0),
        totalFailed: reports.reduce((sum, r) => sum + r.failed, 0),
        totalSkipped: reports.reduce((sum, r) => sum + r.skipped, 0)
      }
    };

    await fs.promises.writeFile(this.outputFile, JSON.stringify(reportData, null, 2));
    console.log(`\n📊 JSON report saved to: ${this.outputFile}`);
  }
}

/**
 * JUnit XML reporter
 */
export class JUnitReporter implements Reporter {
  constructor(private outputFile: string = 'test-report.xml') {}

  async generate(reports: TestReport[]): Promise<void> {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<testsuites>\n';

    for (const report of reports) {
      xml += `  <testsuite name="${report.suiteName}" tests="${report.results.length}" failures="${report.failed}" errors="0" skipped="${report.skipped}" time="${report.duration / 1000}">\n`;
      
      for (const result of report.results) {
        xml += `    <testcase name="${result.name}" time="${result.duration / 1000}"`;
        
        if (result.status === 'FAIL') {
          xml += `>\n      <failure message="${result.error?.message || 'Unknown error'}"><![CDATA[${result.error?.stack || ''}]]></failure>\n    </testcase>\n`;
        } else if (result.status === 'SKIP') {
          xml += `>\n      <skipped/>\n    </testcase>\n`;
        } else {
          xml += '/>\n';
        }
      }
      
      xml += '  </testsuite>\n';
    }

    xml += '</testsuites>';

    await fs.promises.writeFile(this.outputFile, xml);
    console.log(`\n📊 JUnit XML report saved to: ${this.outputFile}`);
  }
}

// Export a default instance for convenience
export const testFramework = new TestFramework();

// Export the core classes and types
