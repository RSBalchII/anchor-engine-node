# Standard 026: Ghost Engine Connection Management and Resilience

## What Happened?
The Ghost Engine (headless browser running CozoDB WASM) was frequently showing "disconnected" status in logs, causing 503 errors for memory ingestion and search requests. The logs showed repeated "Ghost Engine Disconnected" messages followed by successful connections when the engine eventually came online. This created a frustrating user experience where the system appeared broken even though it was working correctly once the Ghost Engine connected.

## The Cost
- Multiple 503 errors in memory API when Ghost Engine was not yet connected
- User confusion about system status and functionality
- Inconsistent behavior during system startup
- 2+ hours spent debugging connection timing issues
- Reduced reliability of memory ingestion during startup phases

## The Rule
1. **Connection Readiness Protocol**: All memory operations (ingest/search) must check Ghost Engine connection status before attempting operations:
   ```python
   if not workers["chat"] or workers["chat"].closed:
       return JSONResponse(status_code=503, content={"error": "Ghost Engine Disconnected"})
   ```

2. **Graceful Degradation**: When Ghost Engine is disconnected, systems should:
   - Return informative 503 errors with clear messaging
   - Continue operating other non-memory functions
   - Implement auto-retry mechanisms for critical operations
   - Log connection status changes for debugging

3. **Connection Monitoring**: Implement WebSocket connection monitoring with:
   - Automatic reconnection attempts
   - Status indicators in logs
   - Health check endpoints to verify connection state

4. **User Experience**: When Ghost Engine is disconnected:
   - UI should show clear status indicators
   - Operations should queue for processing when connection resumes
   - Users should be informed of the connection requirement

5. **Resurrection Protocol**: The ResurrectionManager should:
   - Kill existing browser processes before launching new ones
   - Use proper executable path detection
   - Implement retry logic with exponential backoff
   - Log detailed status during resurrection attempts

## Implementation Notes
The system now properly handles Ghost Engine disconnections by returning clear error messages and automatically reconnecting when the engine comes online. The watchdog continues to operate and queue files for ingestion, which are processed once the Ghost Engine connects.