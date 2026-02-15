# Standard 034: Node.js Monolith Migration

## What Happened?
The system was migrated from a Python/Browser Bridge architecture (V2) to a Node.js Monolith architecture (V3). This involved:
- Archiving legacy Python infrastructure (webgpu_bridge.py, anchor_watchdog.py, etc.)
- Creating a new Node.js server with CozoDB integration
- Implementing autonomous execution protocols
- Converting Python scripts to JavaScript equivalents

## The Cost
- Fragile headless browser architecture with WebGPU dependencies
- Complex Python/JavaScript bridge with multiple failure points
- Resource-intensive browser processes
- Platform compatibility issues (especially on ARM/Android)
- Complex deployment and dependency management

## The Rule
1. **Node.js Monolith**: Use Node.js as the primary runtime environment for the Context Engine.

2. **CozoDB Integration**: Integrate CozoDB directly using `cozo-node` for persistent storage.

3. **Autonomous Execution**: Implement Protocol 001 for detached service execution with proper logging and verification.

4. **File Watchdog**: Use `chokidar` for efficient file system monitoring and automatic ingestion.

5. **API Endpoints**: Implement standardized endpoints:
   - `POST /v1/ingest` - Content ingestion
   - `POST /v1/query` - CozoDB query execution
   - `GET /health` - Service health verification

6. **Legacy Archival**: Archive all V2 Python infrastructure to `archive/v2_python_bridge/`.

7. **JavaScript Conversion**: Convert Python utility scripts to JavaScript equivalents for consistency.

8. **Termux Compatibility**: Ensure architecture works on Termux/Linux environments.

## Implementation
- Created Node.js server in `server/` directory
- Implemented CozoDB with RocksDB backend
- Added file watching functionality with chokidar
- Created migration script for legacy session data
- Converted read_all.py to read_all.js in both locations
- Added proper error handling and logging
- Implemented Protocol 001 for safe service execution