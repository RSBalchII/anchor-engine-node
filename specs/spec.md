# Anchor Core: The Visual Monolith (v3.6)

**Status:** Text-Only + Watchdog + Session Recorder + Context Persistence + Ghost Engine Resilience Architecture | **Philosophy:** Visual Command Center, Resource-Queued.

## 1. The Anchor Architecture
The **Anchor Core** (`webgpu_bridge.py`) is the unified server. The **Ghost Engine** is a headless browser window acting as the GPU Worker. **Watchdog** provides passive text ingestion.

```mermaid
graph TD
    subgraph Anchor_Core [Localhost:8000]
        Bridge[WebGPU Bridge (Python)]

        subgraph Assets
            UI[chat.html]
            Context[context.html]
            Sidecar[sidecar.html]
            Watchdog[watchdog.py]
            Ghost_UI[ghost.html]
            Dreamer[memory-builder.html]
        end

        subgraph API_Endpoints
            ChatAPI["/v1/chat/completions"]
            SearchAPI["/v1/memory/search"]
            IngestAPI["/v1/memory/ingest"]
            GPUAPI["/v1/gpu/lock, /v1/gpu/unlock, /v1/gpu/status"]
            LogAPI["/logs/recent, /logs/collect"]
        end
    end

    subgraph Passive_Ingestion
        Watchdog_Service[Watchdog Service]
        Context_Folder["context/ folder"]
        File_Monitoring[File System Events]
    end

    subgraph Ghost_Engine [Headless Browser]
        Worker[WebLLM (WASM)]
        Memory[CozoDB (WASM)]
        Search[Hybrid Search]
        GPU[WebGPU Resources]
        Connection_Manager[Connection Manager]
    end

    User -->|HTTP| Sidecar
    User -->|HTTP| Context
    User -->|HTTP| Ghost_UI

    Watchdog_Service --> IngestAPI
    Context_Folder --> Watchdog_Service
    File_Monitoring --> Watchdog_Service

    Sidecar -->|Vision Ingest| VisionAPI
    Sidecar -->|Search| SearchAPI
    VisionAPI -->|VLM Analysis| Vision
    Vision -->|Memory Ingest| Ghost_Engine
    SearchAPI -->|Query| Ghost_Engine
    IngestAPI -->|Memory Ingest| Ghost_Engine
    Ghost_Engine -->|Ground Truth| Sidecar

    Sidecar -->|GPU Lock| GPUAPI
    GPUAPI -->|Queue Manager| Ghost_Engine
    Ghost_Engine -->|GPU| Worker

    Bridge -->|WebSocket| Connection_Manager
    Connection_Manager -->|API| Ghost_Engine
    Ghost_Engine -->|GPU| Worker
    ChatAPI -->|MLC-LLM| Worker
    SearchAPI -->|Memory Query| Memory
    IngestAPI -->|Memory Ingest| Memory
    Dreamer -->|Background Processing| Memory
    Resolver -->|File Redirect| Models[Local Model Files]
    UI -->|Context Retrieval| Search_Engine
    Search_Engine -->|Hybrid Results| UI
    Bridge -->|Log Collection| LogAPI
    LogAPI -->|Central Buffer| LogViewer[log-viewer.html]
```

## 2. Model Loading Strategy (Standard 007)
The system now uses an online-first model loading approach for reliability:
- **Primary**: Direct HuggingFace URLs for immediate availability
- **Fallback**: Local model files when available
- **Bridge Redirect**: `/models/{model}/resolve/main/{file}` handles resolution logic
- **Simplified Configuration**: Online-only approach prevents loading hangs (Standard 007)

## 3. Port Map

* **8000**: **The One Port.** Serves UI, API, Models, and WebSocket connections.

## 4. Search Architecture

* **Hybrid Retrieval**: Combines Vector search (semantic) with BM25 (lexical) for optimal results.
* **BM25 FTS**: CozoDB Full Text Search with stemming and relevance scoring.
* **Context Manager**: Intelligent retrieval system in `ContextManager` class.

## 5. Ghost Engine Resilience (Standard 026)

* **Connection Management**: Automatic WebSocket connection monitoring with reconnection attempts
* **Graceful Degradation**: Proper error handling when Ghost Engine is disconnected (503 responses)
* **Status Indicators**: Clear logging and UI indicators for connection status
* **Auto-Resurrection**: Automatic recovery when Ghost Engine becomes available
* **Queue Processing**: Pending operations are processed when connection resumes

## 6. No Resurrection Mode (Standard 027)

* **Manual Control**: Option to disable automatic Ghost Engine launching via NO_RESURRECTION_MODE flag
* **Resource Efficiency**: Reduces resource usage by avoiding automatic browser launches
* **User Flexibility**: Allows users to connect Ghost Engine manually when needed
* **Existing Browser**: Enables use of existing browser windows instead of launching headless instances
* **Environment Variable**: Controlled via `set NO_RESURRECTION_MODE=true` before startup

## 7. Default No Resurrection Behavior (Standard 028)

* **Default Setting**: Ghost Engine resurrection is now disabled by default for resource efficiency
* **Manual Activation Required**: Users must explicitly open ghost.html to connect the Ghost Engine
* **Environment Override**: Set `NO_RESURRECTION_MODE=false` to enable auto-launching
* **Queued Processing**: Files and requests are queued until Ghost Engine connects
* **User Control**: Provides maximum control over when computational resources are used

## 8. Consolidated Data Aggregation (Standard 029)

* **Single Authority**: Use `context/Coding-Notes/Notebook/read_all.py` as the single authoritative script for data aggregation
* **Multi-Format Output**: Generates three formats - text corpus, JSON memory, and YAML memory
* **YAML Formatting**: Uses proper multiline string formatting for readability
* **Encoding Handling**: Robust encoding detection using chardet for reliable processing
* **Recursive Processing**: Processes all subdirectories while respecting exclusions
* **Metadata Preservation**: Maintains file metadata in structured outputs

## 9. Multi-Format Output for Project Aggregation (Standard 030)

* **Multi-Format Support**: The `read_all.py` script in the root directory generates both JSON and YAML versions of memory records
* **YAML Formatting**: Uses proper multiline string formatting (literal style with `|`) for readability
* **Consistent Naming**: Output files follow consistent naming patterns (`combined_text.txt`, `combined_memory.json`, `combined_text.yaml`)
* **Custom Representers**: Implements custom YAML representers to handle multiline content appropriately
* **Maximum Compatibility**: Provides format flexibility for different downstream processing tools

## 10. Ghost Engine Stability Fix (Standard 031)

* **Separate Schema Creation**: Basic schema and FTS index creation must be handled separately to prevent failures
* **Graceful FTS Handling**: FTS creation failures should not prevent basic database functionality
* **Error Prevention**: Proper error handling prevents "undefined" error messages
* **Browser Stability**: Prevents browser crashes during database initialization
* **Fallback Operations**: System continues to function even if advanced features fail

## 11. Ghost Engine Initialization Flow (Standard 032)

* **Sequential Initialization**: Database must be fully initialized before signaling readiness to Bridge
* **Database Readiness Checks**: All operations verify database is properly initialized before execution
* **Proper Error Handling**: Return appropriate errors when database is not ready instead of failing silently
* **Synchronous Connection Flow**: Connect → Initialize Database → Signal Ready → Process Requests
* **Graceful Degradation**: Report initialization failures and avoid processing requests when database fails
* **Message Type Support**: Properly handle all message types including error responses

## 12. CozoDB Syntax Compliance (Standard 033)

* **Schema Creation Syntax**: Use proper CozoDB syntax without line breaks in schema definitions
* **FTS Creation Syntax**: Use correct FTS creation syntax for full-text search indexes
* **Insert Query Syntax**: Use proper `:insert` or `:replace` syntax with correct parameter binding
* **Parameter Formatting**: Format parameters correctly as nested arrays for bulk operations
* **Schema Validation**: Properly propagate schema creation success/failure status
* **Error Propagation**: Ensure all database operations properly handle and report errors

## 13. Node.js Monolith Migration (Standard 034)

* **Node.js Runtime**: Use Node.js as the primary runtime environment for the Context Engine
* **CozoDB Integration**: Integrate CozoDB directly using `cozo-node` for persistent storage
* **Autonomous Execution**: Implement Protocol 001 for detached service execution with proper logging
* **File Watchdog**: Use `chokidar` for efficient file system monitoring and automatic ingestion
* **Standardized Endpoints**: Implement standardized API endpoints for ingestion, querying, and health checks
* **Legacy Archival**: Archive all V2 Python infrastructure to preserve historical code
* **JavaScript Conversion**: Convert Python utility scripts to JavaScript equivalents for consistency
* **Platform Compatibility**: Ensure architecture works on Termux/Linux environments

## 14. Never Attached Mode (Standard 035)

* **Detached Execution Only**: All long-running services must be started in detached mode using appropriate backgrounding techniques
* **No Attached Mode**: Never run services like `npm start`, `python server.py` or similar long-running processes directly in an attached terminal session
* **Proper Logging**: All detached processes must log to the designated `logs/` directory for monitoring and debugging
* **Platform-Specific Detaching**: Use appropriate backgrounding techniques for each platform (nohup, start /min, etc.)
* **Verification Method**: Verify detached services are running by checking logs or connecting to interfaces, not by waiting for terminal output
* **Documentation Requirement**: All startup procedures must specify detached execution methods
* **Domain Organization**: Standards are now organized by domain (CORE, ARCH, DATA, OPS, BRIDGE) for easier navigation