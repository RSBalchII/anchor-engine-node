# Script Running Protocol for ECE_Core

## Purpose
This document outlines the protocol to prevent getting stuck in long-running loops and ensure proper script execution with logging capabilities.

## Core Principles

### 1. Never Run Long-Running Processes in Attached Mode
- Always run services in background mode
- Use `is_background: true` for any process that might run indefinitely
- Never run servers, watchers, or long-running tasks in attached mode

### 2. Log Everything
- All script outputs must be directed to log files
- Log files should be named with the same name as the script + `.log` extension
- Store logs in a dedicated `logs/` directory
- Example: `server.js` → `logs/server.log`

### 3. Time Limits
- Set explicit timeouts for all operations
- Use non-blocking alternatives when available
- Implement graceful termination for long-running processes

## Implementation Guidelines

### For Node.js Applications
```bash
# Instead of: node server.js
# Use: node server.js > logs/server.log 2>&1 &

# For npm scripts:
# Instead of: npm start
# Use: npm start > logs/npm_start.log 2>&1 &
```

### For Python Applications
```bash
# Instead of: python script.py
# Use: python script.py > logs/script.log 2>&1 &
```

### For Shell Commands
```bash
# Instead of: long_running_command
# Use: long_running_command > logs/command.log 2>&1 &
```

## Directory Structure
```
ECE_Core/
├── logs/
│   ├── server.log
│   ├── npm_start.log
│   ├── watchdog.log
│   └── ...
```

## Monitoring Protocol
1. Always check logs instead of waiting for command completion
2. Use `tail -f logs/filename.log` to monitor in real-time
3. Implement health checks via HTTP endpoints when possible
4. Set up process monitoring to detect stuck processes

## Recovery Protocol
1. If a process appears stuck, check the logs first
2. Kill the process if necessary: `pkill -f process_name`
3. Restart with proper logging: `command > logs/filename.log 2>&1 &`
4. Document the issue and update protocols if needed

## Best Practices
- Always verify process is running in background with `jobs` or `ps aux`
- Use process managers for production services
- Implement circuit breakers for potentially infinite loops
- Use timeouts in shell commands: `timeout 300 command`
- Monitor resource usage to detect runaway processes

## Emergency Procedures
1. If stuck in a loop: Cancel the request immediately
2. Check running processes: `ps aux | grep -i process_name`
3. Kill problematic processes: `pkill -f process_name`
4. Check log files for error patterns
5. Restart with proper logging protocols

## Implementation Checklist
- [ ] Create logs directory
- [ ] Update all existing scripts to use logging
- [ ] Verify background execution for all services
- [ ] Set up monitoring for common stuck scenarios
- [ ] Document recovery procedures for each service