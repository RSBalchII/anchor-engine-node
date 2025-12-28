@echo off
echo Starting Sovereign Console Server...

echo.
echo Local Access: http://localhost:8000/

echo.
echo Network Access (for phone/other devices):
for /f "tokens=*" %%a in ('python -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); print(s.getsockname()[0]); s.close()"') do set IP=%%a
echo http://%IP%:8000/
echo.

echo Launching WebGPU Bridge (API Backend)...
set BRIDGE_PORT=8080
set BRIDGE_TOKEN=sovereign-secret
start "WebGPU Bridge" cmd /k "cd /d "%~dp0" && python scripts/smart_gpu_bridge.py"

echo Launching File Server from tools directory...
start "File Server" cmd /k "cd /d "%~dp0\tools" && python -m http.server 8000"

echo.
echo Servers started in separate windows.
echo Open http://localhost:8000 in your browser to access the interface.
echo Press any key to exit...
pause >nul