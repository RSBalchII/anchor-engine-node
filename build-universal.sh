#!/bin/bash
# Universal Build Script for ECE
# This script handles cross-platform building of native modules and packaging

set -e  # Exit on any error

echo "Starting Universal Build Process for ECE..."

# Detect platform and architecture for Node.js compatibility
UNAME_S=$(uname -s)
UNAME_M=$(uname -m)

PLATFORM="unknown"
ARCH="unknown"

if [[ "$UNAME_S" == "Linux" ]]; then
    PLATFORM="linux"
elif [[ "$UNAME_S" == "Darwin" ]]; then
    PLATFORM="darwin"
elif [[ "$UNAME_S" == "CYGWIN"* || "$UNAME_S" == "MINGW"* || "$UNAME_S" == "MSYS"* ]]; then
    PLATFORM="win32"
fi

if [[ "$UNAME_M" == "x86_64" ]]; then
    ARCH="x64"
elif [[ "$UNAME_M" == "arm64" ]]; then
    ARCH="arm64"
elif [[ "$UNAME_M" == "aarch64" ]]; then
    ARCH="arm64" # Linux often reports aarch64
fi

echo "Detected platform: $PLATFORM, architecture: $ARCH"

# Ensure required tools are available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed or not in PATH"
    exit 1
fi

# Install dependencies at root
echo "Installing dependencies..."
npm install

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Build native modules
echo "Building native modules..."

# Navigate to engine directory where binding.gyp resides
cd engine

# Check if we have the required build tools
if ! command -v node-gyp &> /dev/null; then
    echo "node-gyp not found. Installing global dependency..."
    npm install -g node-gyp
fi

echo "Configuring and Building with node-gyp..."
node-gyp configure build

# Define Output Directory expected by PathManager
# Root is ../ relative to engine
OUTPUT_DIR="../native/bin/${PLATFORM}-${ARCH}"
mkdir -p "$OUTPUT_DIR"

echo "Copying native modules to $OUTPUT_DIR ..."

if [ -f "build/Release/ece_native.node" ]; then
    cp "build/Release/ece_native.node" "$OUTPUT_DIR/"
    echo "✅ Success: Copied ece_native.node to $OUTPUT_DIR/"
else
    echo "❌ Error: Build failed? ece_native.node not found in engine/build/Release/"
    exit 1
fi

# Return to root
cd ..

echo "Build process completed successfully!"
echo "Native Module Location: native/bin/${PLATFORM}-${ARCH}/ece_native.node"