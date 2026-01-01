# Logs Directory

This directory contains individual log files for each system component to facilitate debugging and monitoring.

## Log File Naming Convention

Each component writes to its own log file named after the source:

- `system.log` - System startup and general operations
- `chat_api.log` - Chat API requests and responses
- `memory_api.log` - Memory search API operations
- `websocket_bridge.log` - WebSocket connection events
- `python_stdout.log` - Python standard output
- `python_stderr.log` - Python standard error

## Log Rotation

Each log file is automatically truncated to keep only the last 1000 lines to prevent excessive disk usage.

## Log Format

Each log entry follows this format:
```
[YYYY-MM-DD HH:MM:SS] [LEVEL] Message content
```

Where LEVEL is one of: INFO, SUCCESS, ERROR, WARNING, DEBUG

## Accessing Logs

- **Real-time viewing**: Use the log viewer at `http://localhost:8000/log-viewer.html`
- **File access**: Individual log files are available in this directory
- **API access**: Recent logs available via `/logs/recent` endpoint