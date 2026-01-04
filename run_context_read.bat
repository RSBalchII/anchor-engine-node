@echo off
REM ECE_Core Context Read Script with Logging Protocol
REM Follows SCRIPT_PROTOCOL.md standards for detached execution

echo Starting context read with logging protocol...

REM Create logs directory if it doesn't exist
if not exist "..\logs" mkdir "..\logs"

REM Run the context read in background with logging
cd /d "%~dp0\engine"
start /b cmd /c "node run_context_read.js > ../logs/context_read.log 2>&1"

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Check the log
echo Last 5 lines of context_read log:
powershell -Command "Get-Content ../logs/context_read.log -Tail 5"

echo.
echo Context read started in background. Check logs/context_read.log for output.