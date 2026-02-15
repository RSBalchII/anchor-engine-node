# ECE_Core Testing Framework Documentation

## Overview

The ECE_Core testing framework provides a comprehensive suite of tests to ensure system reliability, performance, and correctness. This framework includes:

- Unit tests for individual components
- Integration tests for system workflows
- Performance regression tests
- Diagnostic tests for issue reproduction
- Dataset-specific configuration tests

## Architecture

### Core Components

1. **Test Framework Core** (`core.ts`)
   - Provides the foundational test execution infrastructure
   - Manages test lifecycle, execution, and reporting
   - Supports parallel execution and dependency management

2. **Configuration Manager** (`config.ts`)
   - Handles test configuration and environment setup
   - Manages dataset-specific configurations
   - Provides configuration validation

3. **Diagnostic Test Runner** (`diagnostic-tests.ts`)
   - Implements quick diagnostic tests for issue reproduction
   - Provides health checks for core system components
   - Offers targeted testing for specific failure modes

4. **Performance Test Runner** (`performance-tests.ts`)
   - Implements performance regression tests
   - Measures system performance under various loads
   - Tracks performance metrics over time

5. **Dataset Test Runner** (`dataset-runner.ts`)
   - Manages dataset-specific test configurations
   - Provides tailored testing for different data types and sizes
   - Supports various content formats and structures

## Test Types

### 1. Unit Tests

Unit tests focus on individual functions and modules in isolation:

```typescript
import { testFramework } from './test-framework/core.js';

// Example unit test
testFramework.addTest({
  name: 'Atomizer Functionality',
  description: 'Test the atomization of content into semantic units',
  testFn: async () => {
    const result = await atomizer.atomize('Test content', 'test-source');
    assert(Array.isArray(result), 'Result should be an array');
    assert(result.length > 0, 'Should return at least one atom');
  },
  timeout: 5000,
  tags: ['unit', 'atomizer']
});
```

### 2. Integration Tests

Integration tests verify the interaction between multiple components:

```typescript
// Example integration test
testFramework.addTest({
  name: 'Ingestion Pipeline',
  description: 'Test the full ingestion pipeline from input to storage',
  testFn: async () => {
    // Test the complete flow from ingestion to search
    const content = 'Test content for integration';
    const result = await ingestionService.ingest(content);
    
    // Verify content is searchable
    const searchResults = await searchService.search('Test');
    assert(searchResults.length > 0, 'Content should be searchable after ingestion');
  },
  timeout: 15000,
  tags: ['integration', 'ingestion', 'search']
});
```

### 3. Performance Tests

Performance tests measure system performance and detect regressions:

```typescript
// Example performance test
testFramework.addTest({
  name: 'Search Performance',
  description: 'Test search response time under load',
  testFn: async () => {
    const startTime = performance.now();
    const results = await searchService.search('performance test');
    const duration = performance.now() - startTime;
    
    assert(duration < 1000, `Search should complete in under 1000ms, took ${duration}ms`);
  },
  timeout: 10000,
  tags: ['performance', 'search']
});
```

### 4. Diagnostic Tests

Diagnostic tests provide quick validation and issue reproduction:

```typescript
// Example diagnostic test
testFramework.addTest({
  name: 'Database Connectivity',
  description: 'Verify database connection and basic operations',
  testFn: async () => {
    const result = await db.run('?[a] := a = 1', {});
    assert(result.rows.length > 0, 'Database query should return results');
  },
  timeout: 5000,
  tags: ['diagnostic', 'database']
});
```

## Running Tests

### Running All Tests

```bash
npm test
# or
node ./test-framework/run-tests.js
```

### Running Specific Test Suites

```bash
# Run only diagnostic tests
npm run test:diagnostic

# Run only performance tests
npm run test:performance

# Run tests for a specific dataset
npm run test:dataset -- --dataset=small

# Run tests with specific tags
npm run test:tag -- --tag=search
```

### Running Tests with Options

```bash
# Run tests in verbose mode
npm test -- --verbose

# Run tests in parallel mode
npm test -- --parallel

# Run specific test by name
npm test -- --test-name="Database Connectivity"

# Generate test report
npm test -- --report
```

## Configuration

### Test Configuration File

The test framework uses a configuration file to manage settings:

```json
{
  "environment": {
    "baseUrl": "http://localhost:3000",
    "timeout": 30000,
    "retries": 2,
    "parallel": true,
    "maxWorkers": 4
  },
  "datasets": [
    {
      "name": "minimal",
      "description": "Minimal dataset for quick smoke tests",
      "path": "./test-data/minimal",
      "size": "small",
      "tags": ["smoke", "quick"]
    },
    {
      "name": "standard",
      "description": "Standard dataset for comprehensive testing",
      "path": "./test-data/standard",
      "size": "medium",
      "tags": ["regression", "feature"]
    }
  ],
  "reporters": [
    { "type": "console" },
    { "type": "json", "outputFile": "test-results.json" },
    { "type": "junit", "outputFile": "test-results.xml" }
  ],
  "coverage": {
    "enabled": true,
    "include": ["src/**/*.{ts,js}"],
    "exclude": ["**/node_modules/**", "**/test/**"],
    "thresholds": {
      "statements": 80,
      "branches": 70,
      "functions": 80,
      "lines": 80
    }
  }
}
```

### Dataset-Specific Configuration

Different datasets can have specific configurations:

```typescript
// Example dataset configuration
const datasetConfigs = {
  minimal: {
    name: 'minimal',
    description: 'Quick smoke tests',
    timeout: 5000,
    tags: ['smoke', 'quick', 'ci']
  },
  performance: {
    name: 'performance',
    description: 'Performance and stress testing',
    timeout: 30000,
    tags: ['performance', 'stress', 'load']
  }
};
```

## Test Organization

### By Functionality

Tests are organized by system functionality:

```
tests/
├── unit/
│   ├── atomizer/
│   ├── sanitizer/
│   ├── fingerprinter/
│   └── search/
├── integration/
│   ├── ingestion/
│   ├── search/
│   └── api/
├── performance/
│   ├── ingestion/
│   ├── search/
│   └── memory/
├── diagnostic/
│   ├── health/
│   ├── connectivity/
│   └── native-modules/
└── dataset-specific/
    ├── minimal/
    ├── standard/
    └── large/
```

### By Dataset Size

Different datasets require different test approaches:

- **Small datasets**: Quick smoke tests, basic functionality validation
- **Medium datasets**: Comprehensive feature testing, integration validation
- **Large datasets**: Performance testing, stress testing, memory usage validation
- **XL datasets**: Load testing, endurance testing, resource constraint validation

## Best Practices

### Writing Effective Tests

1. **Be Specific**: Each test should verify one specific behavior
2. **Use Descriptive Names**: Test names should clearly indicate what is being tested
3. **Include Assertions**: Every test should have clear pass/fail criteria
4. **Handle Cleanup**: Ensure tests clean up after themselves
5. **Consider Performance**: Avoid unnecessary delays in tests

### Performance Testing Guidelines

1. **Establish Baselines**: Record performance metrics for reference
2. **Test Under Load**: Verify performance with concurrent operations
3. **Monitor Resources**: Track memory and CPU usage during tests
4. **Test Edge Cases**: Include worst-case scenarios in performance tests
5. **Compare Results**: Track performance changes over time

### Diagnostic Testing Guidelines

1. **Fast Execution**: Diagnostic tests should run quickly
2. **Targeted Scope**: Focus on specific system components
3. **Clear Failure Modes**: Provide clear error messages when tests fail
4. **Issue Reproduction**: Create tests that reproduce known issues
5. **Health Verification**: Verify system health after operations

## Reporting and Monitoring

### Test Reports

The framework generates multiple types of reports:

1. **Console Output**: Real-time test execution feedback
2. **JSON Reports**: Structured data for CI/CD integration
3. **JUnit Reports**: Compatible with CI systems like Jenkins
4. **Performance Reports**: Detailed performance metrics and trends

### Continuous Integration

Tests are integrated into the CI/CD pipeline:

```yaml
# Example CI configuration
test:
  stage: test
  script:
    - npm install
    - npm run test:ci
  artifacts:
    reports:
      junit: test-results.xml
    paths:
      - test-results.json
      - performance-report.txt
  coverage: '/Coverage: \d+\.\d+%/'
```

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout values in configuration
2. **Resource Exhaustion**: Run tests with fewer parallel workers
3. **Database Locks**: Ensure proper cleanup between tests
4. **Memory Leaks**: Monitor memory usage during long-running tests

### Debugging Tips

1. **Enable Verbose Logging**: Use `--verbose` flag for detailed output
2. **Run Single Tests**: Test specific functionality in isolation
3. **Check Configuration**: Verify test environment settings
4. **Monitor Resources**: Track system resources during test execution

## Maintenance

### Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `test-[feature-name].ts`
3. Add test to appropriate test suite
4. Update documentation if needed
5. Run tests to verify functionality

### Updating Existing Tests

1. Identify the test that needs updating
2. Understand the current test behavior
3. Make necessary changes while preserving test intent
4. Run the updated test to verify correctness
5. Update related tests if needed

### Performance Monitoring

1. Track performance metrics over time
2. Set up alerts for performance regressions
3. Regularly review and update performance thresholds
4. Optimize tests that are too slow or resource-intensive