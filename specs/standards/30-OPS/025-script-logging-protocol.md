# Standard 025: Script Logging Protocol for LLM Development

## What Happened?
The system needed a standardized approach for running scripts that generate data for the context engine. Previously, scripts were run directly in the terminal, making it difficult to track their execution, capture their output, and ensure they could run reliably in production environments. The documentation policy specifies that LLM dev scripts should never run in non-detached mode and should output to log files in the logs/ directory.

## The Cost
- Difficulty tracking script execution and debugging issues
- Lack of persistent logs for script runs
- Scripts not designed to run in detached mode as required by the architecture
- Inconsistent logging approaches across different scripts

## The Rule
1. **Detached Mode Only**: All scripts that process data for the context engine must be designed to run in detached mode, not requiring user interaction.

2. **Log File Output**: All scripts must write their execution logs to files in the `logs/` directory with timestamped names following the pattern `scriptname_YYYYMMDD_HHMMSS.log`.

3. **Log Format**: Script logs must follow the same format as other system logs:
   ```
   [YYYY-MM-DD HH:MM:SS] [LEVEL] Message content
   ```
   Where LEVEL is one of: INFO, SUCCESS, ERROR, WARNING, DEBUG

4. **Self-Contained Logging**: Scripts must handle their own logging setup, creating the logs directory if needed and writing to their own log files.

5. **Progress Tracking**: Long-running scripts should log progress indicators at regular intervals to show they are still active.

6. **Error Handling**: Scripts must log errors and exceptions to their log files and continue or exit gracefully as appropriate.

7. **File Path Detection**: Scripts that depend on system executables (like browsers) should implement robust path detection with fallbacks to standard installation locations.

## Implementation Example:
```python
import datetime
import os
from pathlib import Path

def setup_logging(script_name):
    logs_dir = Path(__file__).parent.parent / "logs"
    logs_dir.mkdir(exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = logs_dir / f"{script_name}_{timestamp}.log"
    return log_file

def log_message(log_file, level, message):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] [{level}] {message}\n"
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(log_entry)

def detect_executable_path(executable_name, possible_paths):
    """
    Detect the path of an executable with fallbacks to standard installation locations.

    Args:
        executable_name: Name of the executable as fallback (e.g., 'msedge')
        possible_paths: List of possible installation paths to check

    Returns:
        Path to the executable if found, otherwise the fallback name
    """
    for path in possible_paths:
        if os.path.exists(path):
            return path
    return executable_name  # fallback
```

## Migration Tool Compliance
The `migrate_history.py` tool follows this standard by:
- Creating timestamped log files in the logs/ directory
- Using the standard log format
- Running in detached mode without requiring user interaction
- Providing detailed progress information during execution
- Handling errors gracefully and continuing operation when possible
- Implementing robust file path detection with multiple fallback options