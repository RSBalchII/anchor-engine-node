# PowerShell script to start the ECE ecosystem: Redis, Neo4j, and all ECE agents
# With on-demand model management via ModelManager
# This is a wrapper that delegates to the Python start_ecosystem.py script

# Change to project root directory
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $projectRoot

# Delegate to the Python script with all arguments passed through
python start_ecosystem.py @args