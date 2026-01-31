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

1. **Test Framework Core** (`test-framework/core.ts`)
   - Provides the foundational test execution infrastructure
   - Manages test lifecycle, execution, and reporting
   - Supports parallel execution and dependency management

2. **Dataset Test Runner** (`test-framework/dataset-runner.ts`)
   - Manages configurable test setups for different data sizes and types
   - Supports small, medium, large, and XL datasets
   - Provides performance thresholds and validation

3. **Diagnostic Test Suite** (`test-framework/diagnostic-tests.ts`)
   - Implements quick diagnostic tests for rapid issue reproduction
   - Covers health checks, ingestion, search, and native module validation
   - Designed for continuous integration and deployment pipelines

4. **Performance Regression Tests** (`test-framework/performance-regression-tests.ts`)
   - Tests to detect performance degradation between releases
   - Compares current performance against established baselines
   - Includes ingestion rate, search latency, and memory usage tests

## Running Tests

### All Tests
```bash
npm test
# or
pnpm test
```

### Specific Test Types

#### Diagnostic Tests (Quick Health Check)
```bash
npm run test:diagnostic
# Runs quick diagnostic tests to verify system health
```

#### Performance Regression Tests
```bash
npm run test:performance
# Runs comprehensive performance tests comparing against baselines
```

#### Dataset-Specific Tests
```bash
npm run test:dataset -- --dataset=small
npm run test:dataset -- --dataset=large
# Runs tests with specific dataset configurations
```

#### Unit Tests Only
```bash
npm run test:unit
# Runs only unit tests (fastest option)
```

### Filter Tests by Tag
```bash
npm run test -- --tag=search
npm run test -- --tag=ingestion
npm run test -- --tag=performance
# Runs only tests with specific tags
```

## Test Structure

### Test Configuration
Each test follows this structure:

```typescript
const testConfig: TestConfig = {
  name: 'Descriptive Test Name',
  description: 'What the test verifies',
  testFn: async () => {
    // Test implementation
    // Use assertions to verify expected behavior
  },
  timeout: 30000, // Maximum time for test to complete
  tags: ['search', 'integration'], // Categories for filtering
  dependencies: ['database'], // Other tests that must pass first
  skip: false, // Set to true to skip this test
  only: false // Set to true to run only this test (for debugging)
};
```

### Test Categories

#### 1. Health Tests
- Verify system endpoints are accessible
- Check database connectivity
- Validate native module availability
- Confirm basic functionality

#### 2. Ingestion Tests
- Test content ingestion pipeline
- Verify atomization process
- Validate content sanitization
- Check database persistence

#### 3. Search Tests
- Test search functionality
- Verify result relevance
- Validate query expansion
- Check performance under load

#### 4. Performance Tests
- Measure ingestion rates
- Test search latency
- Monitor memory usage
- Validate throughput under load

#### 5. Integration Tests
- End-to-end workflow validation
- Cross-component functionality
- API contract verification
- Data flow validation

## Creating New Tests

### Adding a Simple Unit Test
```typescript
import { testFramework } from './test-framework/core.js';

const myUnitTest: TestConfig = {
  name: 'My Feature Functionality',
  description: 'Verify that my feature works correctly',
  testFn: async () => {
    // Arrange
    const input = 'test input';
    
    // Act
    const result = myFeatureFunction(input);
    
    // Assert
    if (result !== 'expected output') {
      throw new Error(`Expected 'expected output', got '${result}'`);
    }
  },
  timeout: 5000,
  tags: ['unit', 'my-feature']
};

// Register the test
testFramework.addTest(myUnitTest);
```

### Adding an Integration Test
```typescript
import axios from 'axios';

const myIntegrationTest: TestConfig = {
  name: 'API Endpoint Integration',
  description: 'Verify API endpoint works with database',
  testFn: async () => {
    // Setup
    const testData = { content: 'integration test content', source: 'test' };
    
    // Ingest data
    const ingestResponse = await axios.post('/v1/ingest', testData);
    if (ingestResponse.status !== 200) {
      throw new Error(`Ingest failed: ${ingestResponse.status}`);
    }
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify retrieval
    const searchResponse = await axios.post('/v1/memory/search', { 
      query: 'integration test content' 
    });
    
    if (searchResponse.status !== 200) {
      throw new Error(`Search failed: ${searchResponse.status}`);
    }
    
    if (!searchResponse.data.context?.includes('integration test content')) {
      throw new Error('Search did not return expected content');
    }
  },
  timeout: 30000,
  tags: ['integration', 'api', 'search']
};
```

## Test Data Management

### Dataset Configuration
Tests can be configured to run with different dataset sizes:

```typescript
const datasetConfig: DatasetConfig = {
  name: 'stress-test',
  description: 'Large dataset for performance testing',
  size: 'xl', // 'small', 'medium', 'large', or 'xl'
  path: './test-data/stress',
  tags: ['performance', 'stress'],
  timeout: 120000, // Longer timeout for large datasets
  setup: async () => {
    // Setup function to prepare test environment
  },
  teardown: async () => {
    // Teardown function to clean up after test
  }
};
```

### Test Data Generation
For performance tests, use representative data:

```typescript
function generateTestContent(count: number, size: 'small' | 'medium' | 'large'): string[] {
  const content: string[] = [];
  
  for (let i = 0; i < count; i++) {
    switch (size) {
      case 'small':
        content.push(`Test content block ${i}`);
        break;
      case 'medium':
        content.push(`Medium length content block ${i} with more text to process. This includes multiple sentences and some complexity to properly test the system under realistic conditions.`);
        break;
      case 'large':
        content.push(`Large content block ${i} with substantial text to process. This includes multiple paragraphs, code snippets, and various content types to thoroughly test the system's capabilities. The content is designed to be representative of real-world usage patterns and to stress-test the ingestion and search capabilities. Additional text to increase size and complexity: ${'Lorem ipsum dolor sit amet. '.repeat(50)}`);
        break;
    }
  }
  
  return content;
}
```

## Performance Baselines

### Current Performance Targets
- **Ingestion Rate**: ≥ 50 atoms/second
- **Search Latency**: ≤ 200ms average
- **Memory Usage**: ≤ 500MB during normal operation
- **Startup Time**: ≤ 10 seconds

### Adding Performance Tests
```typescript
const performanceTest: TestConfig = {
  name: 'Feature Performance',
  description: 'Verify feature meets performance requirements',
  testFn: async () => {
    const startTime = Date.now();
    
    // Execute operation to measure
    await myFeatureFunction(largeInput);
    
    const duration = Date.now() - startTime;
    
    // Verify performance requirements
    if (duration > 1000) { // 1 second max
      throw new Error(`Operation took ${duration}ms, exceeding 1000ms limit`);
    }
  },
  timeout: 5000,
  tags: ['performance', 'regression']
};
```

## Continuous Integration

### GitHub Actions Configuration
The testing framework is designed to work with CI/CD pipelines:

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:diagnostic  # Quick health check
      - run: npm run test:performance # Performance regression tests
```

### Test Reports
Tests generate reports in multiple formats:
- Console output for immediate feedback
- JSON reports for CI/CD integration
- JUnit XML for test aggregation tools

## Troubleshooting

### Common Issues

#### Test Timeout
- Increase the timeout value in the test configuration
- Check for infinite loops or blocking operations
- Verify database connectivity and performance

#### Memory Issues
- Large dataset tests may require more memory
- Check for memory leaks in the code being tested
- Use smaller datasets for initial validation

#### Native Module Issues
- Verify native modules are properly built
- Check platform compatibility
- Ensure fallback implementations work when native modules unavailable

### Debugging Tips

#### Run Single Test
Add `only: true` to a test configuration to run only that test:
```typescript
{
  name: 'Debug Test',
  testFn: async () => { /* ... */ },
  only: true  // Only run this test
}
```

#### Enable Verbose Logging
Run tests with verbose output to see detailed execution information:
```bash
npm run test -- --verbose
```

#### Skip Specific Tests
Use `skip: true` to temporarily disable a test:
```typescript
{
  name: 'Flaky Test',
  testFn: async () => { /* ... */ },
  skip: true  // Skip this test temporarily
}
```

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
4. **Compare Results**: Track performance changes over time
5. **Use Representative Data**: Test with data similar to production

### Diagnostic Testing Guidelines
1. **Fast Execution**: Diagnostic tests should run quickly
2. **Targeted Scope**: Focus on specific system components
3. **Clear Failure Modes**: Provide clear error messages when tests fail
4. **Issue Reproduction**: Create tests that reproduce known issues
5. **Health Verification**: Verify system health after operations

## Maintenance

### Adding New Test Categories
1. Create a new test configuration file
2. Follow the established patterns for test structure
3. Add appropriate tags for filtering
4. Update documentation if needed
5. Add to the main test runner

### Updating Performance Baselines
1. Run comprehensive performance tests on stable release
2. Record new baseline metrics
3. Update BASELINE_PERFORMANCE constants
4. Update documentation with new values
5. Verify all performance tests pass with new baselines

### Test Data Management
1. Keep test data representative of real usage
2. Regularly update test datasets to reflect new features
3. Maintain datasets of different sizes for different test types
4. Ensure test data is properly licensed and doesn't contain sensitive information