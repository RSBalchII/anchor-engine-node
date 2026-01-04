# Standard 028: Configuration-Driven System with Default No Resurrection Mode

## What Happened?
The system was automatically launching the Ghost Engine (headless browser) every time the Anchor Core started, which caused issues with resource usage and prevented users from controlling when the Ghost Engine connects. The system now defaults to "No Resurrection Mode" where the Ghost Engine must be manually started by opening ghost.html in the browser. Additionally, ALL system variables are now abstracted to a central configuration file (config.json) to support future settings menu implementation.

## The Cost
- Excessive resource usage from automatically launching headless browser
- Browser processes that couldn't be controlled by the user
- Confusion when multiple browser instances were running
- Unnecessary complexity in the startup process
- Users wanting more control over when the Ghost Engine connects
- Hard-coded values throughout the codebase that made customization difficult

## The Rule
1. **Default Behavior**: The system shall default to `NO_RESURRECTION_MODE=true`, meaning the Ghost Engine is not automatically launched.

2. **Manual Connection**: Users must manually open `ghost.html` in their browser to connect the Ghost Engine to the Bridge.

3. **Environment Override**: Users can set `NO_RESURRECTION_MODE=false` to return to auto-launching behavior.

4. **Queued Operations**: When Ghost Engine is disconnected, operations shall be queued and processed when connection is established.

5. **Clear Messaging**: The system shall provide clear instructions when Ghost Engine is not connected, indicating how to establish the connection.

6. **Configurable Values**: All system parameters shall be configurable via the config.json file, including:
   - Server settings (port, host, CORS origins)
   - Ghost Engine settings (auto resurrection, browser paths, flags)
   - Logging configuration (max lines, directory, format)
   - Memory settings (max ingest size, default limits, char limits)
   - GPU management (enabled, concurrent ops, timeout)
   - Model loading (timeout, default model, base URL)
   - Watchdog settings (enabled, watch directory, allowed extensions, debounce time)

7. **Detached Operation**: All scripts shall run in detached mode with logging to the logs/ directory as per Standard 025.

## Implementation
- Default configuration sets `"ghost_engine.auto_resurrection_enabled": false`
- The start-anchor.bat script defaults to NO_RESURRECTION_MODE=true
- All system variables abstracted to config.json with config_manager.py
- Watchdog logs appropriate messages when Ghost Engine is disconnected
- API endpoints return 503 with clear messaging when Ghost Engine is disconnected
- Files are queued for ingestion when Ghost Engine is not available
- Created start_anchor_detached.py for proper detached operation with logging