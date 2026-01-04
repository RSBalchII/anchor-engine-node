# ECE_Core Context Read Script with Logging Protocol
# Follows SCRIPT_PROTOCOL.md standards for detached execution

Write-Host "Starting context read with logging protocol..." -ForegroundColor Green

# Create logs directory if it doesn't exist
if (!(Test-Path "../logs")) {
    New-Item -ItemType Directory -Path "../logs" | Out-Null
    Write-Host "Created logs directory" -ForegroundColor Cyan
}

# Change to engine directory
Set-Location -Path "$PSScriptRoot\engine"

# Start the context read in background with logging
$process = Start-Process -FilePath "node" -ArgumentList "run_context_read.js" -RedirectStandardOutput "../logs/context_read.log" -RedirectStandardError "../logs/context_read.log" -PassThru -WindowStyle Hidden

Write-Host "Context read process started with PID: $($process.Id)" -ForegroundColor Green

# Wait a moment
Start-Sleep -Seconds 2

# Check the log
Write-Host "Last 5 lines of context_read log:" -ForegroundColor Cyan
Get-Content -Path "../logs/context_read.log" -Tail 5

Write-Host ""
Write-Host "Context read started in background. Check logs/context_read.log for output." -ForegroundColor Green