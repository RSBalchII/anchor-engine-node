# ECE_Core Engine Startup Script with Logging Protocol
# Follows SCRIPT_PROTOCOL.md standards for detached execution

Write-Host "Starting ECE_Core Engine with logging protocol..." -ForegroundColor Green

# Create logs directory if it doesn't exist
if (!(Test-Path "../logs")) {
    New-Item -ItemType Directory -Path "../logs" | Out-Null
    Write-Host "Created logs directory" -ForegroundColor Cyan
}

# Change to engine directory
Set-Location -Path "$PSScriptRoot\engine"

# Start the engine in background with logging
$process = Start-Process -FilePath "node" -ArgumentList "src/index.js" -RedirectStandardOutput "../logs/server.log" -RedirectStandardError "../logs/server_error.log" -PassThru -WindowStyle Hidden

Write-Host "Server process started with PID: $($process.Id)" -ForegroundColor Green

# Wait a moment for the server to start
Start-Sleep -Seconds 3

# Verify the server is running by checking the log
if (Test-Path "../logs/server.log") {
    Write-Host "Last 5 lines of server log:" -ForegroundColor Cyan
    Get-Content -Path "../logs/server.log" -Tail 5
} elseif (Test-Path "../logs/server_error.log") {
    Write-Host "Last 5 lines of error log:" -ForegroundColor Red
    Get-Content -Path "../logs/server_error.log" -Tail 5
} else {
    Write-Host "Warning: Log files not found. Server may not have started." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Server started in background. Check logs/server.log for output." -ForegroundColor Green
Write-Host "Access the interface at: http://localhost:3000" -ForegroundColor Green