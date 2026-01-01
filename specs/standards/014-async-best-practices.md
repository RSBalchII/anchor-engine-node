# Standard 014: Async/Await Best Practices for FastAPI

## What Happened?
The system had multiple "coroutine was never awaited" warnings due to improper async/await usage in the webgpu_bridge.py. These warnings occurred when async functions were called without being properly awaited or when they weren't integrated correctly with FastAPI's event loop system.

## The Cost
- Runtime warnings cluttering the console output
- Potential resource leaks from improperly handled async operations
- Unpredictable behavior in WebSocket connections and API endpoints
- Difficulty debugging real issues due to noise from async warnings

## The Rule
1. **Proper Await Usage**: All async functions must be awaited when called within async contexts
   ```python
   # Correct
   await add_log_entry("source", "type", "message")
   
   # Incorrect
   add_log_entry("source", "type", "message")  # Creates unawaited coroutine
   ```

2. **Event Loop Integration**: When scheduling tasks at module level, ensure they run within an active event loop:
   ```python
   # Correct - in startup event
   async def startup_event():
       await add_log_entry("System", "info", "Service started")
   
   # Incorrect - at module level before event loop starts
   # asyncio.create_task(add_log_entry(...))  # Will cause warning
   ```

3. **FastAPI Event Handlers**: Use FastAPI's event system (`@app.on_event("startup")`) for initialization tasks that require async operations

4. **Background Tasks**: For fire-and-forget async operations, use FastAPI's BackgroundTasks or properly scheduled asyncio tasks within request handlers

5. **WebSocket Cleanup**: Always ensure proper cleanup of async resources in WebSocket exception handlers to prevent resource leaks

6. **Exception Handling**: Wrap async operations in try/catch blocks that properly handle async exceptions and clean up resources