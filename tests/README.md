# Test Suite for Anchor Core

This directory contains all test files for the Anchor Core system, organized to verify functionality across different components.

## Test Files

### Python Tests
- `comprehensive_test_suite.py` - Main test suite covering model loading, data pipeline, endpoint verification, and syntax checking
- `endpoint_syntax_verification.py` - Specific tests for endpoint accessibility and syntax verification
- `test_new_endpoints.py` - Tests for new sidecar, context, and vision endpoints
- `test_model_loading.py` - Tests for model loading functionality and endpoint accessibility
- `test_model_availability.py` - Tests for model availability and download capability
- `test_gpu_fixes.py` - Tests for GPU resource management and lock functionality
- `test_orchestrator.py` - Unit tests for the orchestrator component

### HTML Tests
- `model_test.html` - Interactive web-based test suite for model and endpoint verification

## Running Tests

### Comprehensive Test Suite
```bash
python tests/comprehensive_test_suite.py
```

With custom parameters:
```bash
python tests/comprehensive_test_suite.py --url http://localhost:8000 --token sovereign-secret --output test_report.json
```

### Individual Test Files
```bash
python tests/test_model_loading.py
python tests/test_model_availability.py
python tests/test_gpu_fixes.py
```

### Interactive Web Tests
Start the Anchor Core server and navigate to:
```
http://localhost:8000/tests/model_test.html
```

## Test Coverage

The test suite covers:

1. **Model Loading**: Verifies model availability and accessibility
2. **Data Pipeline**: Tests API endpoints and data flow
3. **Endpoint Verification**: Checks for missing or inaccessible endpoints
4. **Syntax Verification**: Validates Python syntax in critical files
5. **GPU Management**: Tests GPU lock, unlock, and resource management
6. **System Integration**: Verifies end-to-end functionality

## Test Categories

### Model Tests
- Model file accessibility
- Configuration file verification
- Download capability testing

### API Tests
- Health endpoint
- GPU management endpoints
- Shell execution endpoints
- Model pull endpoints

### System Tests
- Bridge functionality
- WebSocket connections
- Authentication