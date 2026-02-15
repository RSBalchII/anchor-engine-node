# Standard 027: No Resurrection Mode for Manual Ghost Engine Control

## What Happened?
The system was automatically launching the Ghost Engine (headless browser) every time the Anchor Core started, which caused issues for users who wanted to use an existing browser window or manually control when the Ghost Engine connects. Users needed an option to disable the automatic resurrection protocol and connect the Ghost Engine manually when needed.

## The Cost
- Unnecessary browser processes launched automatically
- Resource usage when Ghost Engine not needed
- Inability to use existing browser windows for Ghost Engine operations
- Confusion when multiple browser instances were running
- Users wanting more control over when the Ghost Engine connects

## The Rule
1. **Environment Variable Control**: The system must support a `NO_RESURRECTION_MODE=true` environment variable to disable automatic Ghost Engine launching.

2. **Conditional Launch**: When `NO_RESURECTION_MODE=true`, the system shall NOT automatically launch the Ghost Engine during startup.

3. **Manual Connection**: In no resurrection mode, users must manually open `ghost.html` in their browser to connect the Ghost Engine to the Bridge.

4. **Clear Messaging**: The system shall provide clear instructions to users when no resurrection mode is enabled, indicating they need to open ghost.html manually.

5. **Resource Management**: When no resurrection mode is enabled, the system shall not attempt to kill browser processes during shutdown.

6. **API Behavior**: API endpoints that require the Ghost Engine shall return appropriate 503 errors with clear messaging when the Ghost Engine is disconnected, regardless of resurrection mode setting.

## Implementation
- Set environment variable: `set NO_RESURRECTION_MODE=true` before running `start-anchor.bat`
- The Bridge will log a message indicating manual connection is required
- Users open `http://localhost:8000/ghost.html` in their browser to connect the Ghost Engine
- All functionality remains the same, just with manual control over Ghost Engine connection