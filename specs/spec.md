# Anchor Core: The Visual Monolith (v3.0)

**Status:** Unified Architecture | **Philosophy:** One Port, One Truth.

## 1. The Anchor Architecture
The **Anchor Core** (`webgpu_bridge.py`) is the unified server. The **Ghost Engine** is a headless browser window acting as the GPU Worker.

```mermaid
graph TD
    subgraph Anchor_Core [Localhost:8000]
        Bridge[WebGPU Bridge (Python)]

        subgraph Assets
            UI[chat.html]
            Anchor[anchor-mic.html]
            Builder[db_builder.html]
            Memory[memory-builder.html]
        end

        subgraph API_Endpoints
            ChatAPI["/v1/chat/completions"]
            ShellAPI["/v1/shell/exec"]
            ModelAPI["/v1/models/pull"]
            GPUAPI["/v1/gpu/lock"]
            SystemAPI["/v1/system/spawn_shell"]
        end

        subgraph Model_Redirect
            Resolver["/models/{model}/resolve/main/{file}"]
        end
    end

    subgraph Ghost_Engine [Headless Browser]
        Worker[WebLLM (WASM)]
        Memory[CozoDB (WASM)]
        subgraph Search_Engine
            Vector[Vector Search]
            BM25[BM25 FTS]
        end
    end

    User -->|HTTP| UI
    UI -->|WebSocket| Bridge
    Bridge -->|API| Ghost_Engine
    Ghost_Engine -->|GPU| Worker
    ChatAPI -->|MLC-LLM| Worker
    Resolver -->|File Redirect| Models[Local/Online Model Files]
    UI -->|Context Retrieval| Search_Engine
    Search_Engine -->|Hybrid Results| UI

    subgraph ModelLoading
        UI -->|Requests| Resolver
        Resolver -->|Local First| Models
        Models -->|Fallback| Online[Online Models]
    end
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