# Anchor Core Roadmap (V2.2)

**Status:** Unified Architecture Deployed
**Focus:** Model Loading Reliability & Endpoint Completeness.

## Phase 1: Foundation (Completed)
- [x] Pivot to WebLLM/WebGPU stack.
- [x] Implement CozoDB (WASM) for memory.
- [x] Create core HTML tools (`model-server-chat`, `sovereign-db-builder`, `log-viewer`).

## Phase 2: Stabilization (Completed)
- [x] Fix Model Loading (Quota/VRAM config).
- [x] Add 14B Model Support (Qwen2.5, DeepSeek-R1).
- [x] **Snapdragon Optimization**: Implemented Buffer Override (256MB).

## Phase 2.5: Root Refactor (Completed)
- [x] **Kernel Implementation**: Created `sovereign.js` (Unified Logger, State, Hardware).
- [x] **The Ears**: Refactored `root-mic.html` to Root Architecture.
- [x] **The Stomach**: Refactored `sovereign-db-builder.html` to Root Architecture.
- [x] **The Brain**: Refactored `model-server-chat.html` to Root Architecture (Graph-R1 preservation).

## Phase 3: Expansion & Hardening (Completed)
- [x] **Resource Hardening**: Implemented "Consciousness Semaphore" in `sovereign.js`.
- [x] **Documentation Refactor**: Executed "Visual Monolith" strategy.
- [x] **Memory Hygiene**: Implement "Forgetting Curve" in `root-dreamer.html`.
- [x] **Active Memory Persistence**: Enable chat to write back to the Graph.
- [x] **Temporal Awareness**: Ground the model in real-time.
- [x] **Mobile Optimization**: Polish mobile UX for `model-server-chat.html`.

## Phase 4: Ghost & Shell Architecture (Completed)
- [x] **Phase 1:** "Stealth Mode" Cache Bypass (Completed).
- [x] **Phase 2:** Headless Browser Script (`launch-ghost.ps1`) (Completed).
- [x] **Phase 3:** `sov.py` Native Client Implementation.
- [x] **Phase 4:** Neural Shell Protocol (`/v1/shell/exec` endpoint).
- [x] **Phase 4.5:** Ghost Auto-Ignition (Auto-start with ?headless=true flag).
- [x] **Phase 5:** Native Shell Implementation (Anchor terminal with spawn endpoint).
- [x] **Phase 6:** Unified Anchor Core (Single-process architecture on port 8000).
- [ ] **Phase 7:** Migration to C++ Native Runtime (Removing Chrome entirely).

## Phase 5: Model Loading Reliability (Completed)
- [x] **URL Construction Fix**: Implemented `/models/{model}/resolve/main/{file}` redirect for MLC-LLM compatibility.
- [x] **File Renaming**: Standardized component names (`anchor-mic.html`, `memory-builder.html`, `db_builder.html`).
- [x] **Server Stability**: Fixed hanging issues with problematic path parameter syntax.
- [x] **Endpoint Completeness**: Verified all documented endpoints are accessible.

## Phase 5.5: Search Enhancement (Completed)
- [x] **BM25 Implementation**: Replaced regex-based search with CozoDB FTS using BM25 algorithm.
- [x] **Hybrid Search**: Combined vector search (semantic) with BM25 (lexical) for better results.
- [x] **Index Creation**: Added FTS index creation in memory initialization routines.
- [x] **Stemming Support**: Enabled English stemming for improved word variation matching.

## Phase 6: GPU Resource Management (Completed)
- [x] **GPU Queuing System**: Implemented automatic queuing for GPU resource requests to prevent conflicts
- [x] **Resource Status Management**: Added GPU lock status tracking with owner identification
- [x] **503 Error Resolution**: Fixed "Service Unavailable" errors by implementing proper resource queuing
- [x] **Endpoint Integration**: Added `/v1/gpu/lock`, `/v1/gpu/unlock`, `/v1/gpu/status` endpoints
- [x] **Log Integration**: Added GPU resource management to centralized logging system

## Phase 7: Async/Await Best Practices (Completed)
- [x] **Coroutine Fixes**: Resolved "coroutine was never awaited" warnings in webgpu_bridge.py
- [x] **Event Loop Integration**: Properly integrated async functions with FastAPI's event loop
- [x] **Startup Sequence**: Ensured logging system initializes properly with application lifecycle
- [x] **Resource Management**: Fixed resource cleanup in WebSocket handlers to prevent leaks
- [x] **Error Handling**: Enhanced async error handling with proper cleanup procedures

## Phase 8: Browser-Based Control Center (Completed)
- [x] **UI Integration**: Implemented browser-based sidecar with retrieval and vision tabs
- [x] **Vision Engine**: Created Python-powered VLM integration for image analysis
- [x] **Endpoint Expansion**: Added vision ingestion and enhanced logging endpoints
- [x] **File Logging**: Implemented persistent file-based logging with truncation
- [x] **UI Serving**: Extended bridge to serve HTML interfaces for unified workflow

## Phase 9: Federation
- [ ] **Device Sync**: Sync IndexedDB across devices (Peer-to-Peer).
- [ ] **Local-First Cloud**: Optional encrypted backup.
