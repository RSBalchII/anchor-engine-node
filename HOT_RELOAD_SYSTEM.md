# Hot Reload System for GPU Management

## Overview
The hot reload system allows for real-time updates to GPU management logic without requiring service restarts. This significantly improves development workflow and system maintainability.

## Components

### 1. Python Bridge Hot Reload (`scripts/smart_gpu_bridge.py`)
- Monitors GPU-related Python files for changes
- Automatically reloads bridge logic when changes are detected
- Maintains all existing functionality while updating code
- Includes emergency release mechanism to prevent stale locks

### 2. JavaScript Hot Reload (`tools/modules/gpu-hot-reloader.js`)
- Browser-side monitoring for HTML/JS changes
- Provides manual reload triggers for development
- Integrates with existing GPU management system
- Auto-detects development environment (localhost/127.0.0.1)

### 3. Enhanced GPU Manager (`scripts/gpu_manager.py`)
- Includes hot reload status checking
- Provides manual reload triggers
- Enhanced monitoring capabilities

## Usage

### Development Mode
The hot reload system automatically activates when running on localhost:
- Files are monitored every 2 seconds for changes
- Changes to GPU-related files trigger automatic reloads
- Existing GPU locks are safely released during reload

### Manual Triggers
- **Python Bridge**: Send POST to `/v1/hot-reload` endpoint
- **Browser Console**: Call `window.triggerGPUHotReload()`
- **GPU Manager Script**: `python scripts/gpu_manager.py --hot-reload`

### Enable/Disable
- **Browser**: `window.setGPUHotReloadEnabled(true/false)`
- **Environment**: Only active on localhost/127.0.0.1 by default

## Files Monitored
- `tools/webgpu_bridge.py` - Backend bridge logic
- `tools/modules/sovereign.js` - Frontend GPU controller
- `tools/model-server-chat.html` - Main console interface
- `tools/root-mic.html` - Voice input interface
- `tools/root-dreamer.html` - Background processing

## Startup Scripts
- `start-sovereign-console-hotreload.bat` - Launches system with hot reload
- Uses the smart GPU bridge with built-in monitoring

## Benefits
1. **Faster Development**: Changes take effect immediately
2. **No Service Interruption**: Updates occur without restarting services
3. **Stale Lock Prevention**: Automatic cleanup during reloads
4. **Development Convenience**: Built-in triggers for manual reloads

## Production Considerations
- Hot reload is disabled by default in production environments
- Only activates on localhost/127.0.0.1
- Can be manually enabled/disabled as needed
- Includes safety mechanisms to prevent conflicts

## Troubleshooting
- If hot reload isn't working, check file permissions
- Ensure the bridge is running on the expected port (8080)
- Check browser console for hot reload messages
- Use the emergency release endpoint if locks become stuck