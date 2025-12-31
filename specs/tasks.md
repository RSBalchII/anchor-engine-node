# Context-Engine Implementation Tasks

## Current Work Queue (Unified Anchor Architecture)

### Phase 5: Unified Anchor (Completed)
- [x] **Consolidation**: Merge File Server and Bridge into `webgpu_bridge.py` (Port 8000).
- [x] **Renaming**: `model-server-chat` -> `chat.html`, `neural-terminal` -> `terminal.html`.
- [x] **Cleanup**: Archive legacy startup scripts.
- [x] **Launcher**: Create `start-anchor.bat`.
- [x] **Native Shell Spawning**: Implement `/v1/system/spawn_shell` endpoint.
- [x] **Dashboard Integration**: Add Anchor Shell spawn button to `index.html`.
- [x] **Native Client**: Create `anchor.py` for PowerShell terminal spawning.
- [x] **Architecture Documentation**: Create Anchor Core specification.
- [x] **Testing Suite**: Create `test_model_loading.py` and `model_test.html` for endpoint verification.
- [x] **Troubleshooting Documentation**: Add model loading troubleshooting standard.

### Phase 5.1: Model Loading Fixes (Completed)
- [x] **URL Construction Fix**: Implement `/models/{model}/resolve/main/{file}` redirect endpoint for MLC-LLM compatibility.
- [x] **File Renaming**: Rename `root-mic.html` -> `anchor-mic.html`, `root-dreamer.html` -> `memory-builder.html`, `sovereign-db-builder.html` -> `db_builder.html`.
- [x] **UI Layout Fix**: Add proper margins to prevent elements from being cut off at top of browser window.
- [x] **Server Stability**: Fix server hanging issues caused by problematic path parameter syntax.
- [x] **Endpoint Verification**: Ensure all documented endpoints are accessible and responding properly.

### Phase 5.2: Search Enhancement (Completed)
- [x] **BM25 Implementation**: Replace regex-based search with CozoDB FTS using BM25 algorithm in `tools/chat.html`.
- [x] **Index Creation**: Add FTS index creation in `memory-builder.html`, `db_builder.html`, and `chat.html` initialization.
- [x] **Hybrid Search**: Maintain vector search alongside BM25 for semantic + lexical retrieval.
- [x] **Fallback Mechanism**: Implement regex fallback if FTS index is unavailable.
- [x] **Stemming Support**: Enable English stemming for better word variation matching.

### Completed - Root Refactor ✅
- [x] **Kernel**: Implement `tools/modules/sovereign.js`.
- [x] **Mic**: Refactor `root-mic.html` to use Kernel.
- [x] **Builder**: Refactor `sovereign-db-builder.html` to use Kernel.
- [x] **Console**: Refactor `model-server-chat.html` to use Kernel (Graph-R1).
- [x] **Docs**: Update all specs to reflect Root Architecture.

### Completed - Hardware Optimization 🐉
- [x] **WebGPU Buffer Optimization**: Implemented 256MB override for Adreno GPUs.
- [x] **Model Profiles**: Added Lite, Mid, High, Ultra profiles.
- [x] **Crash Prevention**: Context clamping for constrained drivers.
- [x] **Mobile Optimization**: Service Worker (`llm-worker.js`) for non-blocking inference.
- [x] **Consciousness Semaphore**: Implemented resource arbitration in `sovereign.js`.

### Completed - The Subconscious ✅
- [x] **Root Dreamer**: Created `tools/root-dreamer.html` for background memory consolidation.
- [x] **Ingestion Refinement**: Upgraded `read_all.py` to produce LLM-legible YAML.
- [x] **Root Architecture Docs**: Finalized terminology (Sovereign -> Root).
- [x] **Memory Hygiene**: Implemented "Forgetting Curve" in `root-dreamer.html`.

### Completed - Active Cognition ✅
- [x] **Memory Writing**: Implement `saveTurn` to persist chat to CozoDB.
- [x] **User Control**: Add "Auto-Save" toggle to System Controls.
- [x] **Temporal Grounding**: Inject System Time into `buildVirtualPrompt`.
- [x] **Multimodal**: Add Drag-and-Drop Image support to Console.

### Phase 4.1: The Neural Shell (Completed) 🚧
**Objective:** Decouple Intelligence (Chat) from Agency (Terminal).
- [x] **Phase 1:** "Stealth Mode" Cache Bypass (Completed).
- [x] **Phase 2:** Headless Browser Script (`launch-ghost.ps1`) (Completed).
- [x] **Phase 3:** `sov.py` Native Client Implementation.
- [x] **Phase 3.5:** Ghost Auto-Ignition (Headless auto-start with ?headless=true flag).
- [x] **Phase 4:** Migration to C++ Native Runtime (Removing Chrome entirely).
- [x] **Bridge Repair**: Debug and stabilize `extension-bridge` connectivity.
- [x] **Neural Shell Protocol**: Implement `/v1/shell/exec` in `webgpu_bridge.py`.
- [x] **The "Coder" Model**: Add `Qwen2.5-Coder-1.5B` to Model Registry.
- [x] **Terminal UI**: Create `tools/neural-terminal.html` for natural language command execution.

### Phase 4.2: Agentic Expansion (Deferred)
- [ ] **Agentic Tools**: Port Verifier/Distiller logic to `tools/modules/agents.js`.
- [ ] **Voice Output**: Add TTS to Console.

## Phase 5: The Specialist Array
- [ ] **Dataset Generation**: Samsung TRM / Distillation.
- [ ] **Unsloth Training Pipeline**: RTX 4090 based fine-tuning.
- [ ] **Model Merging**: FrankenMoE construction.

### Phase 6: Model Loading Optimization (Completed)
- [x] **Online-First Approach**: Implemented online-only model loading based on working `anchor-mic.html` implementation.
- [x] **Simplified Configuration**: Removed complex local file resolution that caused hangs in `chat.html`.
- [x] **Archived Complex Logic**: Preserved old implementation as `loadModel_archived()` for future reference.
- [x] **Bridge Redirect Enhancement**: Improved `/models/{model}/resolve/main/{file}` endpoint for smart local/online fallback.
- [x] **Model Availability Testing**: Enhanced testing protocols to verify model accessibility across components.
- [x] **Documentation Updates**: Created Standards 007-011 to document model loading improvements.

## Backlog
- [ ] **Federation Protocol**: P2P sync.
- [ ] **Android App**: Wrapper for Root Coda.