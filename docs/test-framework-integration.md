# ECE_Core Test Framework Integration Guide

## Overview

This document explains how the new centralized test framework integrates with the existing test suite in the ECE_Core project. The new framework enhances the existing tests with better organization, performance monitoring, and standardized execution patterns.

## Current Test Structure

The existing test suite is located in `engine/tests/` and contains various test files for different components:

- `suite.js` - Main test suite that validates core API functionality
- `test_*.ts/js` - Individual test files for specific components
- `context_experiments.js` - Verification scripts for context experiments
- `native_*` - Tests for native module functionality
- `atomic_*` - Tests for atomic architecture components

## Integration Approach

Rather than replacing the existing tests, the new framework provides:

1. **Enhanced Execution**: The new framework can run alongside existing tests
2. **Performance Monitoring**: Adds performance tracking to existing tests
3. **Centralized Reporting**: Consolidates results from all test types
4. **Standardized Patterns**: Provides templates for new tests while preserving existing functionality

## Migration Strategy

### Phase 1: Coexistence
- Keep existing tests running as before
- Add new tests using the centralized framework
- Gradually migrate critical tests to new framework

### Phase 2: Enhancement
- Wrap existing tests with performance monitoring
- Add diagnostic capabilities to existing tests
- Implement common setup/teardown patterns

### Phase 3: Consolidation
- Move non-critical tests to new framework
- Maintain legacy tests that work well as-is
- Archive obsolete test patterns

## Running Tests

### With Existing System
```bash
npm test
# or
node tests/suite.js
```

### With New Framework
```bash
# Run all tests through new framework
npm run test:enhanced

# Run specific test categories
npm run test:performance
npm run test:diagnostic

# Run with detailed reporting
npm run test:report
```

## Architecture

The new test framework adds these capabilities:

- **Performance Monitoring**: Tracks execution time and resource usage
- **Diagnostic Tests**: Quick validation for issue reproduction
- **Dataset-Specific Tests**: Configurable tests for different data sizes
- **Centralized Configuration**: Unified settings for all test types
- **Enhanced Reporting**: Detailed metrics and visualization

## Best Practices

1. **Preserve Existing Tests**: Don't remove working tests, enhance them
2. **Gradual Migration**: Move tests incrementally to minimize disruption
3. **Performance Tracking**: Add performance monitoring to critical paths
4. **Diagnostic Capability**: Ensure each component has quick diagnostic tests
5. **Documentation**: Keep test documentation synchronized

## File Organization

```
engine/
├── tests/                    # Existing tests (preserve)
│   ├── suite.js             # Main test suite
│   ├── context_experiments.js
│   ├── native_tests/
│   ├── atomic_tests/
│   └── ...
├── test-framework/          # New framework
│   ├── core.ts              # Core framework
│   ├── config.ts            # Configuration management
│   ├── diagnostic-tests.ts  # Diagnostic tests
│   ├── performance-tests.ts # Performance tests
│   └── dataset-runner.ts    # Dataset-specific tests
└── docs/
    └── testing-framework.md # Documentation
```

## Next Steps

1. Implement the Glass Panel UI integration for test visualization
2. Create React components for test dashboard
3. Add real-time test monitoring capabilities
4. Implement test result persistence
5. Create test automation pipelines