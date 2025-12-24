@echo off
echo Starting WebGPU Bridge...
echo This bridge allows external tools (like Wave Terminal) to talk to the browser.
echo.
set BRIDGE_PORT=8080
set BRIDGE_TOKEN=sovereign-secret
python webgpu_bridge.py
pause