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

## Phase 6: Model Loading Optimization (Completed)
- [x] **Online-First Approach**: Implemented online-only model loading based on working `anchor-mic.html` implementation (Standard 007).
- [x] **Simplified Configuration**: Removed complex local file resolution that caused hangs.
- [x] **Archived Complex Logic**: Preserved old implementation for future reference while using working approach.
- [x] **Bridge Redirect Enhancement**: Improved `/models/{model}/resolve/main/{file}` endpoint for smart local/online fallback.
- [x] **Model Availability Testing**: Enhanced testing protocols to verify model accessibility across components.
- [x] **Documentation Updates**: Created Standards 007-011 to document model loading improvements.

## Phase 7: Federation
- [ ] **Device Sync**: Sync IndexedDB across devices (Peer-to-Peer).
- [ ] **Local-First Cloud**: Optional encrypted backup.
