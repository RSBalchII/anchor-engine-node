$ErrorActionPreference = "Stop"

# Define paths
$ScriptDir = $PSScriptRoot
$BackendDir = Join-Path $ScriptDir ".."
$ProjectRoot = Join-Path $BackendDir ".."
$LogDir = Join-Path $ProjectRoot "logs"
$LogFile = Join-Path $LogDir "server_stdout.log"

# Ensure log dir exists
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

Write-Host "Starting Server..."
Write-Host "Logs will be redirected to: $LogFile"

# Start python launcher.py and redirect output
Set-Location $BackendDir
$env:PYTHONIOENCODING = "utf-8"

# Using Tee-Object to see output and write to file
python launcher.py 2>&1 | Tee-Object -FilePath $LogFile
