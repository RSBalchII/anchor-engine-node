@echo off
REM ECE_Core Context Aggregation Script with Logging Protocol
REM Follows SCRIPT_PROTOCOL.md standards for detached execution

echo Starting context aggregation with logging protocol...

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

REM Run the context aggregation in background with logging
start /b cmd /c "node read_all.js > logs/read_all.log 2>&1"

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Check the log
echo Last 5 lines of read_all log:
powershell -Command "Get-Content logs/read_all.log -Tail 5"

echo.
echo Context aggregation started in background. Check logs/read_all.log for output.