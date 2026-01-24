#!/bin/bash
# Set SDKROOT for macOS builds
# This script should be sourced before running pnpm install or node-gyp rebuild

export SDKROOT="$(xcrun --show-sdk-path)"

echo "SDKROOT set to: $SDKROOT"
