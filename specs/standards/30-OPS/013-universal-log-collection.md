# Standard 013: Universal Log Collection System

## What Happened?
The system had fragmented logging across multiple sources (browser console, Python stdout, WebSocket events) making debugging difficult. Users had to check multiple places to understand system behavior.

## The Cost
- 4+ hours spent debugging connection issues by checking browser console, Python terminal, and WebSocket messages separately
- Inefficient troubleshooting workflow requiring multiple monitoring tools
- Missed error correlations between different system components
- Poor visibility into system-wide operation

## The Rule
1. **Universal Collection**: All system logs (Python, JavaScript, WebSocket, browser, model loading, GPU status) must be aggregated in a single location: `tools/log-viewer.html`
2. **Broadcast Channel Protocol**: All components must use the `sovereign-logs` or `coda_logs` BroadcastChannel to send messages to the log viewer:
   ```javascript
   // From browser components
   const logChannel = new BroadcastChannel('sovereign-logs');
   logChannel.postMessage({
       source: 'component-name',
       type: 'info|success|error|warning|debug',
       time: new Date().toISOString(),
       msg: 'message content'
   });
   ```

3. **Python Integration**: Python scripts must send log data via API endpoints that feed into the log viewer
4. **Centralized Access**: The single point of truth for all system diagnostics is `http://localhost:8000/log-viewer.html`
5. **File-based Logging**: Each component must also write to its own log file in the `logs/` directory for persistent storage
6. **Log Truncation**: Individual log files must be truncated to last 1000 lines to prevent disk space issues
7. **GPU Resource Queuing**: All GPU operations must use the queuing system (`/v1/gpu/lock`, `/v1/gpu/unlock`) to prevent resource conflicts
8. **Source Tagging**: All log entries must be clearly tagged with their source for easy identification