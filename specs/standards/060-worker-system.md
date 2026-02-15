
# Standard 060: Worker System Architecture

**Supersedes**: N/A (New Standard)
**Effective Date**: 2026-01-16
**Status**: Active

## 1. Dual-Worker Model
To resolve concurrency issues (blocking during ingestion), ECE_Core uses a dedicated worker model.

### 1.1 ChatWorker
- **File**: `src/core/inference/ChatWorker.ts`
- **Role**: Handles conversational inference only.
- **Model**: Loaded from `LLM_MODEL_PATH`.
- **Context**: Managed via `LlamaChatSession`.

### 1.2 EmbeddingWorker
- **File**: `src/core/inference/EmbeddingWorker.ts`
- **Role**: Handles vector generation only.
- **Model**: Loaded from `LLM_EMBEDDING_MODEL_PATH`.
- **Context**: Managed via `LlamaEmbeddingContext`.
- **Note**: If `LLM_EMBEDDING_MODEL_PATH` is unset, the system falls back to `HybridWorker` (shared model).

## 2. Provider Routing
- `src/services/llm/provider.ts` is the orchestrator.
- It detects the configuration state and spawns the appropriate workers.
- **Dedicated Mode**: Spawns both workers. Routes `chat` -> ChatWorker, `embed` -> EmbeddingWorker.
- **Shared Mode**: Spawns `HybridWorker`. Routes all traffic to it.

## 3. Communication Protocol
- Workers communicate via `parentPort` messages.
- **Types**: `loadModel`, `chat`, `getEmbeddings`.
- **Error Handling**: Workers must wrap main logic in `try/catch` and send `type: 'error'` on failure.
