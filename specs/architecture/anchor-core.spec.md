# Anchor Core Architecture Specification

**Status:** Active | **Component:** `tools/webgpu_bridge.py`

## Overview
The Anchor Core unifies the Bridge, UI, and API into a single process running on port 8000, eliminating CORS issues and port conflicts.

## Architecture Diagram

```mermaid
graph TD
    User["👤 User"] --> Dashboard["🏠 Dashboard (index.html)"]
    
    subgraph "ANCHOR CORE (Single Process)"
        Bridge["🔗 WebGPU Bridge (8000)"]
        API["⚡ API Endpoints"]
        UI["🌐 UI Server"]
        WS["📡 WebSocket Layer"]
    end
    
    Dashboard --> Bridge
    Bridge --> API
    Bridge --> UI
    Bridge --> WS
    
    subgraph "SHELL PROTOCOL"
        API --> ShellExec["쉘 /v1/shell/exec"]
        API --> Spawn["🚀 /v1/system/spawn_shell"]
    end
    
    ShellExec --> Host["🖥️ Host System"]
    Spawn --> PowerShell["🪟 PowerShell Window"]
```

## Components

### 1. The Unified Core (`webgpu_bridge.py`)
- **Role:** Single server for API, UI, and WebSockets
- **Port:** 8000 (The One Port)
- **Function:** Bridges browser WebGPU to system commands

### 2. Shell Protocol (The Hands)
- **`/v1/shell/exec`**: Execute system commands via bridge

### 3. Context System
- **Context UI**: Read-only interface for quick context retrieval and copy-paste.
- **Memory Search**: Query the Ghost Engine's Graph (Vector + BM25) for relevant context.
- **Memory Builder**: Background processor using Qwen 1.5B in WebGPU for memory processing.

## Endpoints

### `GET /sidecar`
- **Function:** Serves the Context UI (consolidated interface).

### `GET /context`
- **Function:** Serves the Context UI (consolidated interface).

### `POST /v1/memory/search`
- **Function:** Queries the Ghost Engine's Graph (Vector + BM25).
- **Input:** `{ "query": "string" }`
- **Output:** `{ "context": "Formatted Ground Truth..." }`

### `POST /v1/chat/completions`
- **Function:** Proxy to browser engine
- **Auth:** Bearer token

### `POST /v1/shell/exec`
- **Function:** Execute system commands
- **Format:** `{ "cmd": "command" }`

### `POST /v1/system/spawn_shell`
- **Function:** Launch native PowerShell client
- **Result:** New `anchor.py` terminal window

## Search Architecture

### Hybrid Retrieval System
* **Vector Search**: Semantic search using cosine similarity (`vec_l2`)
* **BM25 FTS**: Lexical search using CozoDB Full Text Search with stemming
* **Context Manager**: Intelligent retrieval in `ContextManager.findRelevantMemories()`
* **Fallback Mechanism**: Regex-based search when FTS index unavailable

## Security
- **Token Auth:** `Authorization: Bearer sovereign-secret`
- **CORS Policy:** Open for internal use only
- **System Access:** Restricted to authorized commands