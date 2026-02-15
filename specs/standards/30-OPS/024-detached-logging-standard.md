# Standard 024: Detached Logging and Process Management for LLM Systems

## What Happened?
The system had issues with scripts blocking execution and logs not being properly managed, causing system instability and difficulty in debugging. Scripts were running in attached mode causing blocking operations, and log files were growing without bounds, consuming excessive disk space.

## The Cost
- System instability due to blocking operations
- Excessive disk space consumption from unbounded log files
- Difficulty in debugging due to missing or improperly managed logs
- Process conflicts and hanging operations

## The Rule
1. **Detached Mode Execution**: All scripts, especially those related to LLM models, must run in detached mode to prevent blocking operations:
   ```python
   # For Python scripts launched from batch files
   start "Process Name" /min cmd /c "python script.py > logs/script_output.log 2>&1"
   ```

2. **Universal Log Output**: All scripts must output logs to the designated logs directory (`logs/`) with proper file naming conventions:
   - Python scripts: `python_stdout.log`, `python_stderr.log`
   - Custom components: `{component_name}.log`
   - Error logs: `{component_name}_error.log`

3. **Log Truncation**: All log files must implement automatic truncation to prevent excessive disk usage:
   - Truncate after 5000 lines OR 10000 characters, whichever comes first
   - Keep most recent entries when truncating
   - Implement rotation if needed for high-volume logs

4. **Process Management**: Scripts must properly manage child processes and ensure cleanup:
   - Use proper subprocess management with error handling
   - Implement graceful shutdown procedures
   - Monitor and terminate orphaned processes

5. **Error Handling**: All scripts must implement proper error handling and logging:
   - Catch exceptions and log them appropriately
   - Use structured logging with timestamps and severity levels
   - Ensure logs are written even during error conditions

6. **Resource Management**: Scripts must manage system resources efficiently:
   - Close file handles properly
   - Release memory when possible
   - Monitor resource usage and implement limits

This standard ensures that all system components run reliably in detached mode while maintaining proper logging practices for debugging and monitoring.