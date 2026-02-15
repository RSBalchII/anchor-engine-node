# Standard 075: Build System & Cross-Platform Deployment

**Category:** Architecture / Deployment
**Status:** Active
**Date:** 2026-01-31

## Context
The ECE system must run consistently across Windows, macOS, and Linux platforms with native module acceleration. The build system must handle TypeScript compilation, native module compilation, and Electron packaging seamlessly.

## Build System Architecture

### Hybrid Build System
The project uses a multi-layered build system:

- **Frontend**: Vite with TypeScript compilation and RollDown bundling
- **Engine**: TypeScript compilation with `tsc`
- **Native Modules**: `node-gyp` for C++ compilation
- **Desktop Overlay**: TypeScript compilation with Electron packaging

### Package Management
- **PNPM**: Used for efficient package management and disk space optimization
- **Workspace Structure**: Monorepo with separate packages for frontend, engine, and desktop overlay
- **Dependency Resolution**: Consistent dependency resolution across all packages

## Native Module Compilation

### C++ Module Structure
The native modules follow a standardized structure:

```
src/native/
├── atomizer.cpp/hpp     # Content splitting logic
├── key_assassin.cpp/hpp # Content sanitization
├── fingerprint.cpp/hpp  # SimHash generation
├── html_ingestor.cpp/hpp # HTML processing
└── main.cpp             # N-API bindings
```

### Binding Configuration (binding.gyp)
```json
{
  "targets": [
    {
      "target_name": "ece_native",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "sources": [
        "./src/native/main.cpp",
        "./src/native/key_assassin.cpp",
        "./src/native/atomizer.cpp",
        "./src/native/fingerprint.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ]
    }
  ]
}
```

### Platform-Specific Compilation
- **Windows**: MSVC compiler with appropriate flags
- **macOS**: Clang with libc++ standard library
- **Linux**: GCC with appropriate standard library

## Cross-Platform Compatibility

### Binary Management
- **Platform-Specific Binaries**: Different `.node` files for each platform
- **Path Resolution**: Centralized path management via `PathManager`
- **Architecture Support**: x64 and ARM64 support for all platforms

### CozoDB Integration
- **Database Binaries**: Separate CozoDB binaries for Windows (`cozo_node_win32.node`), macOS (`cozo_node_darwin.node`), and Linux (`cozo_node_linux.node`)
- **Binary Placement**: Automated placement in engine directory during build
- **Loading Fallbacks**: Multiple paths checked for binary availability

## Build Process

### Universal Build Script (build-universal.sh)
```bash
#!/bin/bash
# 1. Detect platform and architecture
# 2. Install dependencies
# 3. Build TypeScript
# 4. Build native modules with node-gyp
# 5. Copy binaries to platform-specific directories
```

### Windows Build Process (start.bat)
```batch
@echo off
# 1. Check for Node.js and PNPM
# 2. Install dependencies
# 3. Build native modules
# 4. Build frontend and engine
# 5. Launch Electron application
```

## Electron Packaging

### Electron Builder Configuration (electron-builder.yml)
```yaml
appId: com.ece.core
productName: "ECE Core"
directories:
  output: "dist"
  buildResources: "build"

# Native module handling
asarUnpack:
  - "**/*.node"
  - "**/engine/build/Release/*"

# External binaries
extraResources:
  - from: "engine/build/Release/ece_native.node"
    to: "bin/ece_native.node"
  - from: "engine/cozo_node_win32.node"
    to: "bin/cozo_lib.node"

win:
  target: "nsis"
  icon: "assets/icon.ico"

mac:
  target: "dmg"
  icon: "assets/icon.icns"
  hardenedRuntime: true

linux:
  target: "deb"
  category: "Development"
```

## Deployment Strategy

### Automated Build Process
1. **Dependency Hygiene**: Check and install missing dependencies
2. **Native Module Build**: Compile C++ modules for target platform
3. **TypeScript Compilation**: Compile all TypeScript files
4. **Frontend Bundling**: Bundle frontend with Vite/RollDown
5. **Electron Packaging**: Package application with Electron

### Platform-Specific Considerations

#### Windows
- **Prerequisites**: Visual Studio Build Tools for native module compilation
- **Binary Placement**: CozoDB binaries must be placed in engine directory
- **Execution Policy**: May require adjustment for script execution

#### macOS
- **Prerequisites**: Xcode Command Line Tools
- **Security**: May require Gatekeeper exceptions for unsigned binaries
- **SIP**: System Integrity Protection considerations for file access

#### Linux
- **Prerequisites**: build-essential package
- **Permissions**: Proper permissions for executable files
- **Dependencies**: Runtime library dependencies (glibc, etc.)

## Testing & Validation

### Build Verification
- **Compilation Success**: Verify all TypeScript files compile without errors
- **Native Module Loading**: Test native module loading on target platform
- **Functional Testing**: Verify core functionality works with native modules

### Cross-Platform Testing
- **Consistent Behavior**: Ensure identical behavior across platforms
- **Performance Validation**: Verify native module performance on each platform
- **Resource Usage**: Monitor memory and CPU usage patterns

## Troubleshooting

### Common Build Issues
- **Missing Build Tools**: Install platform-specific build tools
- **Native Module Failures**: Verify compiler and SDK installations
- **Permission Issues**: Check file permissions for executables

### Native Module Debugging
- **Compilation Errors**: Check compiler flags and dependencies
- **Loading Failures**: Verify binary compatibility and paths
- **Performance Issues**: Profile native module operations

## Continuous Integration

### Build Automation
- **Dependency Management**: Automated dependency installation
- **Cross-Platform Builds**: CI/CD pipelines for all supported platforms
- **Binary Distribution**: Automated packaging and distribution of binaries

### Quality Assurance
- **Build Verification**: Automated testing of build artifacts
- **Performance Baselines**: Track performance metrics across builds
- **Compatibility Testing**: Verify functionality across platforms