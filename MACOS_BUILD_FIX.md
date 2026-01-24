# macOS Build Fix for Native Addons

> **📋 Official Standard:** [075-macos-native-build-configuration.md](specs/standards/00-CORE/075-macos-native-build-configuration.md)

## Problem

On macOS 15+ (Sequoia), native Node.js addons may fail to build with the error:

```
fatal error: 'functional' file not found
```

This occurs because the C++ standard library headers are not found during compilation.

## Quick Fix

### Option 1: Automatic (Recommended)

The SDKROOT export has been added to your `~/.zshrc` file. Open a new terminal, or source your profile:

```bash
source ~/.zshrc
pnpm install
```

### Option 2: Manual per-session

Source the provided script:

```bash
source ./set-sdk.sh
pnpm install
```

### Option 3: One-time inline

```bash
SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk pnpm install
```

## Full Documentation

For complete details including:

- Implementation requirements
- Verification procedures
- Troubleshooting steps
- Platform compatibility
- Related standards

See **[Standard 075: macOS Native Build Configuration](specs/standards/00-CORE/075-macos-native-build-configuration.md)**
