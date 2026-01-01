@echo off
echo ⚓ STARTING ANCHOR SYSTEM IN BACKGROUND...

REM Check for low-resource mode
if "%LOW_RESOURCE_MODE%"=="true" (
    echo 📱 Low-Resource Mode Enabled
) else (
    if "%CPU_ONLY_MODE%"=="true" (
        echo 💻 CPU-Only Mode Enabled
    )
)

REM 1. Start the Unified Server (Truly Background - no window)
if "%LOW_RESOURCE_MODE%"=="true" (
    start "Anchor Core" /min cmd /c "cd tools && set LOW_RESOURCE_MODE=true && python webgpu_bridge.py"
) else (
    if "%CPU_ONLY_MODE%"=="true" (
        start "Anchor Core" /min cmd /c "cd tools && set CPU_ONLY_MODE=true && python webgpu_bridge.py"
    ) else (
        start "Anchor Core" /min cmd /c "cd tools && python webgpu_bridge.py"
    )
)

REM 2. Wait for Server to initialize
echo Waiting for server to initialize...
timeout /t 5 /nobreak >nul

REM 3. Launch the Ghost Engine (Truly Background - no window)
REM Points to the new chat.html on the single port in headless mode (FIXED: JavaScript Enabled)
echo 👻 Launching Ghost Engine...
if "%LOW_RESOURCE_MODE%"=="true" (
    start "Ghost Engine" /min cmd /c "msedge --app=http://localhost:8000/chat.html?headless=true --start-minimized --remote-debugging-port=9222 --no-first-run --no-default-browser-check --disable-extensions --disable-plugins --disable-images --disable-web-security --user-data-dir=%TEMP%\anchor_ghost --max-active-webgl-contexts=1 --max-webgl-contexts-per-group=1 --disable-gpu-memory-buffer-compositor-resources --force-gpu-mem-available-mb=64 --force-low-power-gpu"
) else (
    if "%CPU_ONLY_MODE%"=="true" (
        start "Ghost Engine" /min cmd /c "msedge --app=http://localhost:8000/chat.html?headless=true --start-minimized --remote-debugging-port=9222 --no-first-run --no-default-browser-check --disable-extensions --disable-plugins --disable-images --disable-web-security --user-data-dir=%TEMP%\anchor_ghost --force-low-power-gpu --disable-gpu-sandbox --disable-features=VizDisplayCompositor"
    ) else (
        start "Ghost Engine" /min cmd /c "msedge --app=http://localhost:8000/chat.html?headless=true --start-minimized --remote-debugging-port=9222 --no-first-run --no-default-browser-check --disable-extensions --disable-plugins --disable-images --disable-web-security --user-data-dir=%TEMP%\anchor_ghost"
    )
)

echo.
echo ✅ Anchor System Started in Background
echo    Open http://localhost:8000 in your browser when ready
echo    Services will start automatically when you access the UI
echo.
echo 💡 For low-resource devices: set LOW_RESOURCE_MODE=true before running
echo 💡 For CPU-only: set CPU_ONLY_MODE=true before running
echo.
echo 🔄 Ghost Engine should connect automatically to enable chat and memory search