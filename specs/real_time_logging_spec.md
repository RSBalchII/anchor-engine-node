# Real-Time Logging Specification for ECE

## Overview
This document defines the new real-time logging approach for the External Context Engine (ECE) that displays all agent outputs and model inference directly in the terminal during development.

## Motivation
The previous logging system had several issues:
- Logs were only written to files, making debugging difficult
- Arbitrary health check delays slowed down service communication
- No real-time visibility into agent operations

## Implementation Details

### 1. Real-Time Output Streaming
- All subprocess calls now stream output directly to the terminal
- Uses threading to handle stdout and stderr simultaneously
- Output is prefixed with the service name for clear identification

### 2. Reduced Health Check Delays
- Health check intervals reduced from 2 seconds to 0.5 seconds
- Service timeouts reduced from 60 seconds to 30 seconds
- Port availability checks timeout reduced from 60 to 30 seconds

### 3. Unified Display
- All service outputs (llama.cpp server, orchestrator, agents) are displayed in the same terminal
- Prefixes distinguish between service types (e.g., "[llama.cpp]", "[orchestrator]", "[agents]")

### 4. Backwards Compatibility
- File-based logging is still maintained for record keeping
- All logs continue to be written to the logs/ directory
- Console output is added as an additional option

## Changes Made

### start_simplified_ecosystem.py
The following methods were updated:

1. `start_llama_server` - Now streams real-time output from llama.cpp server
2. `start_ece_agents` - Now streams real-time output from orchestrator and agent processes
3. `start_docker_services` - Now streams real-time output from docker-compose
4. `wait_for_service` - Reduced timeout and interval for faster communication
5. `wait_for_port` - Reduced timeout and interval for faster communication
6. All logging calls changed to print statements for immediate visibility
7. Implemented threading for real-time output streaming

### README.md
Added "Improved Development Experience" section documenting the new real-time logging features.

## Benefits

1. **Immediate Feedback**: Developers can see service output in real-time as it happens
2. **Faster Debugging**: Issues can be identified immediately rather than waiting for file logs
3. **Improved Communication**: Reduced health check delays enable faster service communication
4. **Better Visibility**: All components are visible in a single terminal view
5. **Maintained Records**: File logging still provides permanent records for later analysis

## Configuration

To control the logging behavior, the following environment variables can be used:

- `LOG_FILE_SIMPLIFIED_STARTUP` - Specify the log file name (default: debug_log_simplified_startup.txt)
- The system logs to both file and console by default

## Usage

Simply run the ecosystem as before:
```
uv run .\run_simplified_ecosystem.py
```

All service outputs will now be displayed directly in the terminal in real-time.

## Future Improvements

1. Add optional color coding for different service types
2. Implement log level filtering for console output
3. Add more granular control over which services stream to console
4. Consider a terminal UI for better organization of multiple service outputs