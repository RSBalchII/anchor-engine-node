# Standard 035: Never Attached Mode for Long-Running Services

## What Happened?
Long-running services and scripts were being executed in attached mode, causing command-line interfaces to block for extended periods (sometimes hours). This happened during server startup when `npm start` was run directly in the terminal, causing the process to hang and occupy the command line for extended periods.

## The Cost
- Command-line interfaces blocked for hours preventing other operations
- Resource waste from keeping terminals open unnecessarily
- Poor developer experience with unresponsive command prompts
- Risk of accidental process termination when closing terminals
- Violation of the principle that long-running services should operate independently

## The Rule
1. **Detached Execution Only**: All long-running services (servers, daemons, watchers) must be started in detached mode using appropriate backgrounding techniques.

2. **No Attached Mode**: Never run services like `npm start`, `python server.py`, or similar long-running processes directly in an attached terminal session.

3. **Proper Logging**: All detached processes must log to the designated `logs/` directory for monitoring and debugging.

4. **Platform-Specific Detaching**:
   - *Linux/Mac:* Use `nohup command > logs/output.log 2>&1 &` or systemd services
   - *Windows:* Use `start /min cmd /c "command > ..\logs\output.log 2>&1"` or similar backgrounding
   - *Cross-platform:* Use process managers like pm2 or nodemon with background options

5. **Verification Method**: After starting a service in detached mode, verify it's running by checking logs or attempting to connect to its interface, not by waiting for terminal output.

6. **Documentation Requirement**: All startup procedures must specify detached execution methods, never attached execution.

## Implementation
- Updated all documentation to specify detached execution methods
- Created background startup scripts where appropriate
- Added proper error handling and logging to detached processes
- Established monitoring procedures for detached services
- Educated team members on detached vs attached execution differences