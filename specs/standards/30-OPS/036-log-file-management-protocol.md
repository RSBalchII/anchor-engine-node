# Standard 036: Log File Management Protocol

**Status:** Active | **Category:** Operations (30-OPS) | **Authority:** Human-Locked

## The Triangle of Pain

### 1. What Happened
LLM agents and developers were unable to monitor long-running processes effectively because output was directed to terminal sessions that became unresponsive. Without proper log file management, debugging and monitoring of detached processes became impossible, leading to system state uncertainty.

### 2. The Cost
- **Inability to Monitor:** No visibility into detached process status
- **Debugging Difficulty:** Impossible to troubleshoot stuck processes
- **Resource Management:** Unclear which processes were running or failing
- **System State Confusion:** No clear way to verify process completion or errors

### 3. The Rule
**All detached processes MUST write to specific log files in the `logs/` directory with proper naming conventions and rotation.**

#### Specific Requirements:
- **Centralized Logging:** All process output goes to `logs/` directory at project root
- **Descriptive Naming:** Log files named after the process with optional timestamp: `process_name.log`
- **Format Consistency:** All logs must be human and machine readable (text format)
- **Size Management:** Implement log rotation or truncation to prevent infinite growth
- **Access Path:** Standard path `logs/process_name.log` for all processes

#### Examples:
```bash
# CORRECT: Proper logging
node server.js > logs/server.log 2>&1 &
python data_process.py > logs/data_process.log 2>&1 &

# Log file structure
logs/
├── server.log
├── data_process.log
├── context_read.log
└── backup_operation.log
```

#### Verification:
- Log files must be created before process execution
- Log files must be accessible and writable
- Log content must reflect actual process output
- Log files must be monitored instead of terminal sessions

## Cross-References
- Standard 035: Script Running Protocol - Detached Execution with Logging
- Related to: Standard 013 (Universal Logging)

## Implementation
- Created `logs/` directory in project root
- All startup scripts now direct output to log files
- Log files are monitored for process status verification
- Documentation updated to reference log file checking

---
*Verified by Architecture Council. Edited by Humans Only.*