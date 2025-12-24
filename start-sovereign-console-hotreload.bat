@echo off
REM Enhanced Sovereign Console Startup with Hot Reload Support
echo Starting Sovereign Console with Hot Reload Support...

echo.
echo ========================================
echo  ECE_Core Startup with Hot Reload
echo ========================================
echo.

REM Start the WebGPU Bridge with hot reload capability in a new window
echo Launching WebGPU Bridge with Hot Reload (API Backend)...
set BRIDGE_PORT=8080
set BRIDGE_TOKEN=sovereign-secret
start "WebGPU Bridge (Hot Reload)" cmd /k "cd /d "%~dp0" && python scripts/smart_gpu_bridge.py"

echo.
echo ========================================
echo  Available Services:
echo  - Bridge: http://localhost:8080
echo  - File Server: http://localhost:8000
echo  - Console: http://localhost:8000/model-server-chat.html
echo  - Mic: http://localhost:8000/root-mic.html
echo  - Dreamer: http://localhost:8000/root-dreamer.html
echo ========================================
echo.

REM Launch the file server from tools directory in a new window
echo Launching File Server from tools directory...
start "File Server" cmd /k "cd /d "%~dp0\tools" && python -m http.server 8000"

echo.
echo Servers started in separate windows.
echo Open http://localhost:8000 in your browser to access the interface.
echo Press any key to exit...
pause >nul