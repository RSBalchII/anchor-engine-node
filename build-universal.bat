@echo off
REM Universal Build Script for ECE on Windows
REM This script handles building of native modules and packaging

echo Starting Universal Build Process for ECE...

REM Detect architecture (Simplified for Windows usually x64)
set ARCH=x64
if "%PROCESSOR_ARCHITECTURE%"=="ARM64" set ARCH=arm64
set PLATFORM=win32

echo Detected output target: %PLATFORM%-%ARCH%

REM Ensure required tools
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    exit /b 1
)

npm --version >nul 2>&1
if errorlevel 1 (
    echo Error: npm is not installed or not in PATH
    exit /b 1
)

REM Install dependencies
echo Installing dependencies...
call npm install

REM Build TypeScript
echo Building TypeScript...
call npm run build

REM Build native modules
echo Building native modules...

REM Navigate to engine where binding.gyp is
cd engine

REM Check for node-gyp
if not exist "node_modules\.bin\node-gyp.cmd" (
    echo node-gyp not found locally. attempting global check...
    call node-gyp --version >nul 2>&1
    if errorlevel 1 (
         echo Installing node-gyp globally...
         call npm install -g node-gyp
    )
)

REM Configure and build
echo Configuring and Building...
call node-gyp configure build

REM Define Output Directory
set OUTPUT_DIR=..\native\bin\%PLATFORM%-%ARCH%
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo Copying native modules to %OUTPUT_DIR% ...

if exist "build\Release\ece_native.node" (
    copy "build\Release\ece_native.node" "%OUTPUT_DIR%\" >nul
    echo ✅ Success: Copied ece_native.node to %OUTPUT_DIR%
) else (
    echo ❌ Error: ece_native.node not found in engine\build\Release
    cd ..
    exit /b 1
)

REM Return to root
cd ..

echo Build process completed successfully!
echo Native Module Location: native\bin\%PLATFORM%-%ARCH%\ece_native.node