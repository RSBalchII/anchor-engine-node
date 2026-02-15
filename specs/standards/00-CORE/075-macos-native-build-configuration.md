# Standard 075: macOS Native Build Configuration (Sequoia SDK Fix)

**Status:** Active | **Domain:** 00-CORE | **Category:** Build Systems & Platform Compatibility

## 1. Problem Statement

On macOS 15+ (Sequoia), native Node.js addons fail to build with fatal errors when the C++ standard library headers cannot be located:

```
fatal error: 'functional' file not found
#include <functional>
         ^~~~~~~~~~~~
```

This occurs despite:

- Having Xcode Command Line Tools installed
- Having the correct SDK at `/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk`
- Proper C++17 flags in `binding.gyp`

The root cause is that node-gyp on macOS 15.2+ does not automatically detect or pass the SDK root path to the compiler, breaking standard library header resolution.

## 2. Quick Reference (User-Facing)

For developers encountering this issue, here are the recommended solutions:

### 2.1 Automatic (Recommended)
The SDKROOT export has been added to your `~/.zshrc` file. Open a new terminal, or source your profile:
```bash
source ~/.zshrc
pnpm install
```

### 2.2 Manual per-session
Source the provided script:
```bash
source ./set-sdk.sh
pnpm install
```

### 2.3 One-time inline
```bash
SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk pnpm install
```

## 3. Implementation Requirements

### 3.1 binding.gyp Configuration

The `binding.gyp` file MUST include explicit C++ standard library include paths for macOS:

```python
{
  "targets": [
    {
      "target_name": "ece_native",
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "<!@(echo $SDKROOT)/usr/include/c++/v1"
      ],
      "conditions": [
        ["OS==\"mac\"", {
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "NO",
            "CLANG_CXX_LIBRARY": "libc++",
            "MACOSX_DEPLOYMENT_TARGET": "10.15",
            "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
            "SDKROOT": "macosx",
            "OTHER_CPLUSPLUSFLAGS": [
              "-std=c++17",
              "-stdlib=libc++"
            ]
          },
          "cflags_cc": ["-std=c++17", "-stdlib=libc++"],
          "ldflags": ["-stdlib=libc++"]
        }]
      ]
    }
  ]
}
```

**Key elements:**

1. Explicit include path: `<!@(echo $SDKROOT)/usr/include/c++/v1`
2. `SDKROOT` setting in xcode_settings
3. Proper C++17 flags with `-stdlib=libc++`

### 3.2 Environment Configuration

The `SDKROOT` environment variable MUST be set before building:

```bash
export SDKROOT="$(xcrun --show-sdk-path)"
```

**Implementation locations:**

1. **Developer shell profile** (`~/.zshrc` or `~/.bashrc`):

```bash
# macOS SDK path for native addon builds
export SDKROOT="$(xcrun --show-sdk-path)"
```

2. **Project helper script** (`set-sdk.sh`):

```bash
#!/bin/bash
export SDKROOT="$(xcrun --show-sdk-path)"
echo "SDKROOT set to: $SDKROOT"
```

3. **CI/CD pipelines** MUST set this variable before build steps

### 3.3 Build Process

The standard build workflow is:

```bash
# Option 1: Using pre-configured environment
pnpm install

# Option 2: Manual SDKROOT setting
SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk pnpm install

# Option 3: Using project helper
source ./set-sdk.sh && pnpm install
```

## 4. Verification

### 4.1 SDK Detection

Verify SDK is properly installed:

```bash
# Check Xcode Command Line Tools
xcode-select -p
# Expected: /Library/Developer/CommandLineTools

# Verify SDK path
xcrun --show-sdk-path
# Expected: /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk

# Check C++ headers exist
ls /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/include/c++/v1/functional
```

### 4.2 Compiler Validation

Test that the compiler can find standard headers:

```bash
echo '#include <functional>' | clang++ -x c++ -std=c++17 -stdlib=libc++ \
  -isysroot $(xcrun --show-sdk-path) -E - &>/dev/null && echo "OK"
```

### 4.3 Build Success Indicators

A successful build shows:

```
gyp info it worked if it ends with ok
  CXX(target) Release/obj.target/ece_native/src/native/main.o
  CXX(target) Release/obj.target/ece_native/src/native/key_assassin.o
  CXX(target) Release/obj.target/ece_native/src/native/atomizer.o
  CXX(target) Release/obj.target/ece_native/src/native/fingerprint.o
  SOLINK_MODULE(target) Release/ece_native.node
gyp info ok
```

## 5. Platform Compatibility

### 5.1 Affected Platforms

- **macOS 15.0+** (Sequoia): REQUIRED
- **macOS 14.x** (Sonoma): Recommended
- **macOS 13.x and earlier**: Optional (builds work without this fix)

### 5.2 Tested Configurations

- macOS 26.2 (Sequoia 15.2) - Build 25C56
- Node.js v24.12.0
- node-gyp v12.1.0
- Apple clang version 17.0.0

### 5.3 Non-macOS Platforms

This standard does NOT apply to:

- **Linux**: Uses system-provided libstdc++/libc++
- **Windows**: Uses MSVC toolchain with different configuration

## 6. Troubleshooting

### 6.1 Command Line Tools Issues

If build fails, reinstall Command Line Tools:

```bash
# Remove existing tools
sudo rm -rf /Library/Developer/CommandLineTools

# Reinstall
xcode-select --install

# Verify installation
xcode-select -p && xcrun --show-sdk-path
```

### 6.2 Multiple Xcode Versions

If multiple Xcode versions exist, ensure correct toolchain:

```bash
# List all developer directories
sudo xcode-select --switch /Library/Developer/CommandLineTools

# Verify
xcode-select -p
```

### 6.3 Environment Not Persisting

If SDKROOT is not persisting across sessions:

1. Check that `~/.zshrc` contains the export
2. Verify shell is actually zsh: `echo $SHELL`
3. Source the profile: `source ~/.zshrc`
4. Verify: `echo $SDKROOT`

## 7. Related Standards

- [074-native-module-acceleration.md](074-native-module-acceleration.md) - Native module architecture
- [Standard 010: ARCH](../10-ARCH/) - System architecture decisions
- [Standard 030: OPS](../30-OPS/) - Operations and deployment

## 8. References

- **Issue Tracker**: macOS Sequoia C++ header resolution
- **Date Identified**: January 24, 2026
- **Resolution**: binding.gyp update + SDKROOT environment variable
- **node-gyp Version**: 12.1.0
- **Node.js Version**: v24.12.0

## 9. Compliance

All native modules in the ECE_Core project MUST:

- ✅ Include proper macOS SDK configuration in binding.gyp
- ✅ Document SDKROOT requirement in README
- ✅ Provide helper scripts for SDK environment setup
- ✅ Test on latest macOS versions before release
- ✅ Gracefully degrade if native module fails to build

## 10. Future Considerations

- Monitor node-gyp updates for automatic SDK detection improvements
- Consider pre-built binaries for common platforms
- Evaluate alternative build systems (CMake.js, node-pre-gyp)
- Track macOS SDK changes in future OS releases
