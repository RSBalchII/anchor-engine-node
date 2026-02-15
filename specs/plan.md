# Anchor Core Roadmap (V3.0)

**Status:** Hybrid C++/Node.js Architecture Deployed & Semantic Shift Architecture Implemented
**Focus:** Agent Harness Integration & Production Stability.

## Phase 1: Foundation (Completed)
- [x] Pivot to Node.js/TypeScript stack.
- [x] Implement PGlite (PostgreSQL-compatible) for memory.
- [x] Create core tools (`model-server-chat`, `sovereign-db-builder`).

## Phase 2: Stabilization (Completed)
- [x] Fix Model Loading (Quota/VRAM config).
- [x] Add 14B Model Support (Qwen2.5, DeepSeek-R1).
- [x] **Hardware Optimization**: Implemented Buffer Override (256MB).

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
- [x] **FTS Optimization**: Implement native PGlite BM25 search.
- [x] **Operational Safety**: Implement detached execution and logging protocols (Standard 035/036).
- [x] **Snapshot Portability**: Create "Eject" (Backup) and "Hydrate" (Restore) workflow (Standard 037).

## Phase 10: Cortex Upgrade (Completed)
- [x] **Local Inference**: Integrate `node-llama-cpp` for GGUF support (Standard 038).
- [x] **Multi-Bucket Schema**: Migrate from single `bucket` to `buckets: [String]` (Standard 039).
- [x] **Dreamer Service**: Implement background self-organization via local LLM.
- [x] **PGlite Hardening**: Resolve query syntax errors and performance issues (Standard 040).
- [x] **ESM Interop**: Fix dynamic import issues for native modules in CJS.

## Phase 11: Markovian Reasoning Engine (Completed)
- [x] **Scribe Service**: Implement rolling session state compression (Standard 041).
- [x] **Context Weaving**: Auto-inject Markovian state into inference.
- [x] **Test Suite**: Create `engine/tests/suite.js` for API verification.
- [x] **Benchmark Tool**: Create `engine/tests/benchmark.js` for accuracy testing.
- [x] **Configuration Hardening**: Externalize paths, fix package.json, add validation.

## Phase 12: Native Module Acceleration (Completed)
- [x] **Infrastructure Setup**: Install `node-addon-api` and `node-gyp`.
- [x] **Native Bridge**: Implement C++/N-API integration (Standard 074).
- [x] **Module 1**: Key Assassin (Text Hygiene) with zero-copy processing.
- [x] **Module 2**: Atomizer (Text Splitting) with performance optimization.
- [x] **Module 3**: Fingerprint (Deduplication) with SimHash algorithm.
- [x] **Performance**: Achieve 2.3x improvement over JavaScript implementations.

## Phase 13: Browser Paradigm Implementation (Completed)
- [x] **Architecture Evolution**: Hybrid Node.js/C++ with N-API boundary.
- [x] **Path Manager**: Centralized path resolution for cross-platform compatibility.
- [x] **Native Module Manager**: Graceful degradation with fallback mechanisms.
- [x] **Resource Manager**: Memory optimization and performance monitoring.

## Phase 14: Semantic Shift Architecture (Completed)
- [x] **Semantic Category System**: Replace granular tags with high-level semantic categories.
- [x] **Relationship Discovery Protocol**: Entity co-occurrence detection.
- [x] **Stateless Contextual Chat**: Ground responses in ECE search results instead of chat history.
- [x] **Molecule-Atom Architecture**: Hierarchical content organization.

## Phase 15: Tag-Walker & Search Optimization (Completed)
- [x] **Tag-Walker Protocol**: Replaced vector search with 3-phase graph retrieval.
- [x] **Smart Search Protocol**: Intelligent parsing and dynamic fallback mechanisms (Standard 094).
- [x] **FTS Hardening**: Prevent parser crashes with query sanitization.
- [x] **Performance**: Optimize search with GIN indices.

## Phase 16: UI Consolidation & Glass Panel Design (Completed)
- [x] **UI Simplification**: Standardize on single-column `GlassPanel` layout.
- [x] **Remove Complexity**: Eliminate multi-column layouts and neural terminal.
- [x] **Glass Panel Aesthetic**: Consistent frosted glass appearance across components.

## Phase 17: Production Polish & Verification (Completed)
- [x] **API Fortification**: Add input validation for all endpoints.
- [x] **Search Resiliency**: Fix bucket-filtering bypass issues.
- [x] **Verification Suite**: 100% pass rate on test suite.
- [x] **Streaming Responses**: Implement SSE for real-time token streaming.
- [x] **Clean Install Script**: Create one-click setup for new users.

## Phase 18: Monorepo & Configuration Unification (Completed)
- [x] **PNPM Migration**: Convert to `pnpm` workspace for efficient dependency management.
- [x] **Shared Types**: Create `@ece/shared` for unified TypeScript interfaces.
- [x] **Unified Config**: Implement `sovereign.yaml` as single source of truth.
- [x] **Lifecycle Management**: Electron Main automatically spawns/kills engine process.

## Phase 19: Agent Harness Agnosticism (Current Focus)
- [x] **Data Atomization Service**: Core functionality as foundation for agent systems.
- [x] **API Design**: Standardized endpoints for multiple agent harnesses (UniversalRAG).
- [x] **Stateless Architecture**: Context retrieval without session memory.
- [ ] **OpenCLAW Integration**: Primary target harness implementation.
- [ ] **Harness Plugin System**: Extensible architecture for new agent systems.
- [ ] **Performance Monitoring**: Track multi-harness performance metrics.

## Phase 20: Advanced RAG & Context Management (Up Next)
- [x] **Deterministic Semantic Expansion**: Synonym ring for embedding-like matching without VRAM.
- [ ] **Backup System**: Robust snapshotting/restore functionality.
- [ ] **Smart Context**: Middle-Out "Rolling Slicer" logic for large contexts.
- [ ] **Live Context Visualizer**: "RAG IDE" with real-time visualization.
- [ ] **Provenance**: Trust hierarchy switching with bias controls.

## Phase 21: Federation & Scalability (Future)
- [ ] **Device Sync**: Sync snapshots across devices (P2P or cloud).
- [ ] **Multi-Model**: Support multiple models loaded simultaneously.
- [ ] **Distributed Processing**: Scale across multiple machines.
- [ ] **Enterprise Features**: Advanced security and access controls.