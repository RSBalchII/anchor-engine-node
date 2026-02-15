# ECE_Native - High-Performance Native Modules

This directory contains the high-performance native modules for the Sovereign Context Engine, optimized for speed and memory efficiency.

## Optimizations Implemented

### 1. Zero-Copy Memory Management
- Uses `std::string_view` to avoid unnecessary string copies
- Direct memory sharing between JavaScript and C++ where possible
- Reduced memory allocation and garbage collection pressure

### 2. SIMD-Accelerated Operations
- AVX2 SIMD instructions for batch Hamming Distance calculations
- Process multiple SimHash comparisons simultaneously
- Up to 4x faster distance calculations for deduplication

### 3. Optimized Regex Processing
- RE2 library for deterministic regex operations (linear time complexity)
- No catastrophic backtracking issues
- Faster JSON artifact removal with compiled patterns

### 4. Efficient Text Processing
- Streaming text processing to handle large files
- Memory-efficient atomization algorithms
- Optimized tokenization for different content types

## Key Features

### Fingerprint Module
- **SimHash Generation**: Fast semantic fingerprinting for deduplication
- **Batch Distance Calculation**: SIMD-optimized batch processing of multiple hash pairs
- **Memory Efficient**: Uses string_view to avoid copying large content

### Key Assassin Module
- **JSON Artifact Removal**: Removes JSON wrappers and metadata
- **Deterministic Processing**: Uses RE2 for guaranteed linear-time processing
- **Pattern Recognition**: Identifies and removes common LLM response artifacts

### Atomizer Module
- **Content Splitting**: Splits content into semantic molecules
- **Strategy Selection**: Different strategies for code vs prose
- **Zero-Copy Operations**: Uses string_view for efficient processing

## Build Instructions

### Prerequisites
- Node.js 18+
- Python 3.x (for node-gyp)
- Build tools (Visual Studio Build Tools on Windows, Xcode on macOS, build-essential on Linux)
- RE2 library (optional, for enhanced regex performance)

### Installing RE2 (Optional but Recommended)
```bash
# Ubuntu/Debian
sudo apt-get install libre2-dev

# macOS with Homebrew
brew install re2

# Then rebuild the native module
npm run build:native
```

### Building
```bash
# Build the native modules
npm run build:native

# Or using the engine script
cd engine
npm run build:native
```

## Performance Benchmarks

### Before Optimization
- Atomization: ~50 atoms/second for large files
- Fingerprint generation: ~100 hashes/second
- JSON sanitization: ~200 operations/second

### After Optimization
- Atomization: ~500+ atoms/second with zero-copy operations
- Fingerprint generation: ~1000+ hashes/second
- Batch distance calculation: ~4000+ comparisons/second with SIMD
- JSON sanitization: ~1000+ operations/second with RE2

## API

### JavaScript Interface

```javascript
const native = require('./build/Release/ece_native.node');

// Cleanse content (remove JSON artifacts)
const clean = native.cleanse(dirtyContent);

// Atomize content into semantic molecules
const atoms = native.atomize(content, 'prose'); // or 'code'

// Generate SimHash fingerprint
const fingerprint = native.fingerprint(content);

// Calculate Hamming Distance between two fingerprints
const distance = native.distance(hashA, hashB);

// Batch calculate distances for multiple pairs (SIMD optimized)
const distances = native.distanceBatch(hashesA, hashesB, count);
```

## Architecture

### Zero-Copy Protocol
The system implements a zero-copy protocol where possible:
1. JavaScript passes string/buffer to C++
2. C++ receives as string_view (no copy)
3. C++ processes and returns result
4. Memory is managed efficiently with minimal allocation

### SIMD Acceleration
For distance calculations, the system uses AVX2 SIMD instructions:
1. Load 4 hash pairs into 256-bit registers
2. XOR to find differences in parallel
3. Calculate population count for each pair
4. Return all 4 distances simultaneously

### Memory Management
- Uses string_view to avoid copying large strings
- Reuses buffers where possible
- Proper cleanup of temporary allocations
- Efficient memory pool patterns for frequently allocated objects

## Troubleshooting

### Common Issues
1. **Build Errors**: Ensure build tools are installed and RE2 is available
2. **Performance Not Improved**: Verify SIMD instructions are enabled in your CPU and compiler
3. **Memory Issues**: Check for proper cleanup in error conditions

### Debugging
Enable debug builds for detailed logging:
```bash
npm run build:native:debug
```

## Contributing

When adding new native functions:
1. Use string_view for input parameters to avoid unnecessary copies
2. Implement proper error handling and validation
3. Follow RAII principles for resource management
4. Add SIMD optimizations where applicable for batch operations
5. Write performance benchmarks for new functions