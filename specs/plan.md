# Anchor Core Roadmap (V2.4)

**Status:** Markovian Reasoning Deployed & Context Assembly Experiments Added
**Focus:** Production Polish & Verification.

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

## Phase 3: Markovian Reasoning & Context Optimization (Completed)
- [x] **Scribe Service**: Created `engine/src/services/scribe.js` for rolling state
- [x] **Context Weaving**: Upgraded `inference.js` to auto-inject session state
- [x] **Dreamer Service**: Enhanced `dreamer.js` with batch processing to prevent OOM errors
- [x] **Semantic Translation**: Added intent translation via local SLM
- [x] **Context Experiments**: Created `engine/tests/context_experiments.js` for optimal context window sizing
- [x] **The Brain**: Refactored `model-server-chat.html` to Root Architecture (Graph-R1 preservation).

## Phase 3-8: [Archived] (Completed)
*See `specs/tasks.md` for detailed historical phases.*

## Phase 9: Node.js Monolith & Snapshot Portability (Completed)
- [x] **Migration**: Move from Python/Browser Bridge to Node.js Monolith (Standard 034).
- [x] **FTS Optimization**: Implement native CozoDB BM25 search.
- [x] **Operational Safety**: Implement detached execution and logging protocols (Standard 035/036).
- [x] **Snapshot Portability**: Create "Eject" (Backup) and "Hydrate" (Restore) workflow (Standard 037).

## Phase 10: Cortex Upgrade (Completed)
- [x] **Local Inference**: Integrate `node-llama-cpp` for GGUF support (Standard 038).
- [x] **Multi-Bucket Schema**: Migrate from single `bucket` to `buckets: [String]` (Standard 039).
- [x] **Dreamer Service**: Implement background self-organization via local LLM.
- [x] **Cozo Hardening**: Resolve list-handling and `unnest` syntax errors (Standard 040).
- [x] **ESM Interop**: Fix dynamic import issues for native modules in CJS.

## Phase 11: Markovian Reasoning Engine (Completed)
- [x] **Scribe Service**: Implement rolling session state compression (Standard 041).
- [x] **Context Weaving**: Auto-inject Markovian state into inference.
- [x] **Test Suite**: Create `engine/tests/suite.js` for API verification.
- [x] **Benchmark Tool**: Create `engine/tests/benchmark.js` for accuracy testing.
- [x] **Configuration Hardening**: Externalize paths, fix package.json, add validation.

## Phase 12: Production Polish (In Progress)
- [ ] **UI/UX Overhaul**: Implement "Flight Recorder" aesthetic for the dashboard.
- [ ] **Chat Cockpit**: Enhance `interface/chat.html` with conversation history.
- [ ] **Streaming Responses**: Implement SSE for real-time token streaming.
- [ ] **Android Compatibility**: Ensure Node.js monolith runs in Termux.
- [ ] **Clean Install Script**: Create one-click setup for new users.

## Phase 13: Enterprise & Advanced RAG (Up Next)
- [ ] **Backup System**: Robust snapshotting/restore (Feature 7).
- [ ] **Smart Context**: Middle-Out "Rolling Slicer" logic (Feature 8).
- [ ] **RAG IDE**: Live Context Visualization in UI (Feature 9).
- [ ] **Provenance**: Trust Hierarchy switching (Feature 10).

## Phase 14: Federation (Future)
- [ ] **Device Sync**: Sync snapshots across devices (P2P or cloud).
- [ ] **Local-First Cloud**: Optional encrypted backup.
- [ ] **Multi-Model**: Support multiple models loaded simultaneously.