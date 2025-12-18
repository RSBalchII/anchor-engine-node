@echo off
echo Starting Context Engine Backend...
set PYTHONPATH=%CD%\backend
python backend/launcher.py
pause