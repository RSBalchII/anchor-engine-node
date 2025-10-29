@echo off
REM Batch script to start the ECE ecosystem: Redis, Neo4j, and all ECE agents
REM With on-demand model management via ModelManager
REM This is a wrapper that delegates to the Python start_ecosystem.py script

REM Change to project root directory
cd /d "%~dp0\.."

REM Delegate to the Python script with all arguments passed through
python start_ecosystem.py %*