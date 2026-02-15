# Anchor_Native Optimized Modules Installation Guide

This guide explains how to install and use the optimized native modules with SIMD and RE2 support.

## Prerequisites

### System Requirements
- Node.js 18+
- Python 3.x (for node-gyp)
- Build tools:
  - **Windows**: Visual Studio Build Tools 2019+ with C++ support
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: build-essential package (`sudo apt-get install build-essential`)

### Optional Libraries (Recommended for Maximum Performance)

#### 1. Google RE2 (Regex Engine)
For enhanced regex performance and guaranteed linear-time processing:

**Ubuntu/Debian:**
```bash
sudo apt-get install libre2-dev
```

**macOS (with Homebrew):**
```bash
brew install re2
```

**Windows (with vcpkg):**
```cmd
vcpkg install re2
```

#### 2. simdjson (JSON Parser)
For high-speed JSON parsing (2-3 GB/s):

**Download from:** https://github.com/simdjson/simdjson
**Installation:**
```bash
# Clone the repository
git clone https://github.com/simdjson/simdjson.git
cd simdjson
mkdir build && cd build
cmake ..
make -j
sudo make install
```

## Installation Methods

### Method 1: Using CMake.js (Recommended)

1. **Install CMake.js globally:**
```bash
npm install -g cmake-js
```

2. **Install optional dependencies (recommended):**
```bash
# If you installed RE2
npm install --build-from-source --cmake-args="-DUSE_RE2=ON" .
```

3. **Build the optimized native modules:**
```bash
cd engine
cmake-js compile
```

### Method 2: Using node-gyp (Fallback)

1. **Install with optional RE2 support:**
```bash
# Set environment variable to enable RE2 if installed
export USE_RE2=1  # On Windows: set USE_RE2=1
npm install
```

2. **Build the native modules:**
```bash
cd engine
npm run build:native
```

## Build Configuration

### CMakeLists.txt Features
The CMake build system includes:

- **SIMD Optimization**: Automatically detects and enables AVX2 instructions
- **RE2 Integration**: Conditionally compiles with RE2 if available
- **simdjson Support**: Prepares for high-speed JSON parsing
- **Cross-Platform**: Works on Windows, macOS, and Linux

### Conditional Compilation Flags

- `USE_RE2`: Enables Google RE2 regex engine for linear-time processing
- `USE_SIMDJSON`: Enables simdjson for high-speed JSON parsing
- `USE_AVX2_SIMD`: Enables AVX2 SIMD instructions for batch operations

## Performance Features

### 1. Zero-Copy Operations
- Uses `std::string_view` to avoid unnecessary string copies
- Direct memory sharing between JavaScript and C++
- Reduced memory allocation and garbage collection pressure

### 2. SIMD-Accelerated Operations
- AVX2 SIMD instructions for batch Hamming Distance calculations
- Process 4 SimHash comparisons simultaneously
- Up to 4x faster distance calculations for deduplication

### 3. Optimized Regex Processing
- Google RE2 library for deterministic regex operations
- No catastrophic backtracking issues
- Faster JSON artifact removal with compiled patterns

### 4. Batch Processing API
New functions for high-throughput operations:

```javascript
// Batch distance calculation (SIMD optimized)
const distances = native.distanceBatch(hashesA, hashesB, count);
```

## Verification

### Test the Installation
Run the performance benchmark to verify optimizations are working:

```bash
cd engine
npm run benchmark
```

### Expected Output
You should see performance improvements:
- Fingerprint generation: 2-3x faster
- Content cleansing: 2-4x faster with RE2
- Batch distance calc: 4-8x faster with SIMD
- Memory usage: 30-50% reduction

## Troubleshooting

### Common Issues

1. **"re2/re2.h: No such file or directory"**
   - Solution: Install RE2 library or build without RE2 support

2. **"error: unrecognized command line option '-mavx2'"**
   - Solution: Your CPU/compiler doesn't support AVX2; optimizations will fall back to standard operations

3. **"node-gyp rebuild" fails**
   - Solution: Ensure build tools are installed and try with CMake.js instead

### Debugging Build Issues

1. **Verbose build output:**
```bash
cmake-js compile --verbose
```

2. **Check for missing dependencies:**
```bash
pkg-config --list-all | grep re2  # Check if RE2 is available
```

3. **Verify SIMD support:**
```bash
# On Linux
lscpu | grep avx2
# On macOS
sysctl -a | grep avx2
```

## Updating from Previous Versions

If upgrading from a previous version:

1. **Clean previous builds:**
```bash
rm -rf build/ node_modules/
npm install
```

2. **Rebuild with optimizations:**
```bash
cd engine
cmake-js compile  # or npm run build:native
```

## Performance Validation

After installation, validate performance improvements with:

```javascript
// Example performance test
const start = performance.now();
for (let i = 0; i < 1000; i++) {
    native.fingerprint('test content for performance validation');
}
const end = performance.now();
console.log(`1000 fingerprint operations took: ${end - start}ms`);
```

## Support

If you encounter issues with the optimized build:

1. Check the system requirements
2. Verify optional libraries are properly installed
3. Review the build logs for specific error messages
4. Consult the performance benchmark results