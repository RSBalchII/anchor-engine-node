# Standard 035: Script Running Protocol - Detached Execution with Logging

**Status:** Active | **Category:** Operations (30-OPS) | **Authority:** Human-Locked

## The Triangle of Pain

### 1. What Happened
LLM agents and developers were running long-running services (servers, watchers, data processing scripts) in attached mode, causing command-line sessions to become unresponsive for 20-30+ minutes. This created a "stuck loop" where the agent appeared unresponsive and could not continue with other tasks.

### 2. The Cost
- **Lost Productivity:** 20-30+ minutes of unresponsive sessions requiring manual intervention
- **Resource Waste:** Processes consuming memory without visible progress
- **Development Friction:** Repeated manual cancellations and restarts
- **System Instability:** Risk of multiple conflicting processes running simultaneously

### 3. The Rule
**All long-running processes MUST execute in detached mode with output redirected to timestamped log files.**

#### Specific Requirements:
- **Detached Execution:** Use `start /b` (Windows) or `&` (Unix) to run processes in background
- **Output Logging:** Redirect stdout and stderr to `logs/` directory with descriptive filenames
- **Log Naming:** Use format `script_name_[timestamp].log` or `service_name.log`
- **Verification Method:** Check log files or connect to service interfaces instead of waiting for terminal output
- **Platform Compatibility:** Implement appropriate backgrounding for each platform (Windows batch/PowerShell, Unix shell)

#### Examples:
```bash
# CORRECT: Detached with logging
node server.js > logs/server.log 2>&1 &
python process_data.py > logs/data_processing.log 2>&1 &

# INCORRECT: Attached mode
node server.js
python process_data.py
```

#### Enforcement:
- All scripts in the codebase must follow this protocol
- New scripts must include proper logging from inception
- Documentation must specify detached execution methods
- LLM agents must verify processes are running in background before proceeding

## Cross-References
- Standard 025: Detached Script Execution
- Related to: Standards 013 (Universal Logging), 014 (Async Best Practices)

## Implementation
- Created `SCRIPT_PROTOCOL.md` with detailed procedures
- Added `logs/` directory for all script outputs
- Created startup scripts (`start_engine.bat`, `start_engine.ps1`) following the protocol
- Updated all documentation to reference detached execution methods

---
*Verified by Architecture Council. Edited by Humans Only.*