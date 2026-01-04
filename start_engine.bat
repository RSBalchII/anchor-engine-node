@echo off
REM ECE_Core Engine Startup Script with Logging Protocol
REM Follows SCRIPT_PROTOCOL.md standards for detached execution

echo Starting ECE_Core Engine with logging protocol...

REM Create logs directory if it doesn't exist
if not exist "..\logs" mkdir "..\logs"

REM Check if server is already running by checking for the log file lock
echo Checking for existing server instance...
if exist "..\logs\server.log" (
    echo Warning: server.log exists, checking if server is already running...
    REM Try to copy the file to see if it's locked
    copy "..\logs\server.log" "..\logs\temp_check.log" >nul 2>&1
    if errorlevel 1 (
        echo Server appears to be running already. Please stop it first with: taskkill /f /im node.exe
        echo Or check the existing logs at logs/server.log
        pause
        exit /b 1
    ) else (
        del "..\logs\temp_check.log" >nul 2>&1
    )
)

REM Start the engine in background with logging
cd /d "%~dp0\engine"
start /b cmd /c "node src/index.js > ../logs/server.log 2>&1"

REM Wait a moment for the server to start (Windows compatible)
choice /c yn /d y /t 3 > nul

REM Verify the server is running by checking the log
echo Checking server status...
if exist "../logs/server.log" (
    powershell -Command "Get-Content ../logs/server.log -Tail 5"
) else (
    echo Warning: Log file not found. Server may not have started.
)

echo.
echo Server started in background. Check logs/server.log for output.
echo Access the interface at: http://localhost:3000