@echo off
echo 📱 STARTING ANCHOR SYSTEM IN LOW-RESOURCE MODE...

echo 📋 Configuration:
echo   - GPU Buffer: 64MB (conservative)
echo   - Single-threaded operations
echo   - Small model defaults (Phi-3.5-mini)
echo   - Reduced cache sizes
echo   - Longer timeouts for stability

REM Set environment variables for low-resource mode
set LOW_RESOURCE_MODE=true

REM 1. Start the Unified Server with low-resource settings
echo Starting Anchor Core...
start "Anchor Core" /min cmd /c "cd tools && set LOW_RESOURCE_MODE=true && python webgpu_bridge.py"

REM 2. Wait for Server to initialize
echo Waiting for server to initialize...
timeout /t 5 /nobreak >nul

REM 3. Launch the Ghost Engine with conservative GPU settings (FIXED: JavaScript Enabled)
echo 👻 Launching Ghost Engine...
start "Ghost Engine" /min cmd /c "msedge --app=http://localhost:8000/chat.html?headless=true --start-minimized --remote-debugging-port=9222 --no-first-run --no-default-browser-check --disable-extensions --disable-plugins --disable-images --disable-web-security --user-data-dir=%TEMP%\anchor_ghost --max-active-webgl-contexts=1 --max-webgl-contexts-per-group=1 --disable-gpu-memory-buffer-compositor-resources --force-gpu-mem-available-mb=64 --force-low-power-gpu --disable-gpu-driver-workarounds --disable-gpu-sandbox --disable-features=VizDisplayCompositor --disable-gpu-memory-buffer-video-frames --disable-gpu-memory-buffer-compositor-resources"

echo.
echo ✅ Anchor System Started in Low-Resource Mode
echo    Open http://localhost:8000 in your browser when ready
echo    Services will start automatically when you access the UI
echo.
echo 💡 Tips for low-resource devices:
echo   - Use Phi-3.5-mini or smaller models
echo   - Expect slower response times
echo   - Close other GPU-intensive applications
echo   - Consider using CPU-only mode if GPU crashes persist