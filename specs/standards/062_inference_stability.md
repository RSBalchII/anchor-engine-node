
# Standard 062: Inference Worker Stability

**Status:** Active
**Context:** Local LLM/Embedding inference via `node-llama-cpp` or similar bindings.

## 1. The Pain (Context Explosions)
*   **Symptom:** Worker threads crashing with `Input is longer than context size` errors during background embedding.
*   **Cause:** "Dense Text" (Minified code, base64, foreign languages) can have a 1:1 Character-to-Token ratio. A 6000-char chunk becomes 6000 tokens, overflowing a 2048-token context.
*   **Risk:** System instability, lost data, and endless retry loops.

## 2. The Solution (Dynamic Safety)
### A. Context Awareness
*   **Dynamic Configuration:** Workers MUST read the actual `CTX_SIZE` from load options, not assume 4096.

### B. The "Safe Ratio" Rule
*   **Logic:** Truncate input text *before* tokenization using a conservative safety factor.
*   **Formula:** `SafeLength = floor(ContextSize * 1.2)`
    *   Example: 2048 tokens * 1.2 = 2457 chars.
*   **Blob Strategy:** For detected dense content (avg line len > 300), use an even stricter hard limit (e.g. 1500 chars) to guarantee safety.

## 3. Worker Isolation
*   **Error Containment:** A crash in a worker (e.g., CUDA error) MUST NOT crash the main process.
*   **Queue Resilience:** If a batch fails, the worker should attempt to recover or return a partial result (e.g., empty embeddings for failed items) rather than hanging the queue indefinitely.

## 4. The "Ghost CUDA" Patch
*   **Symptom:** Setting `GPU_LAYERS=0` for a worker still results in CUDA initialization and VRAM usage (leading to OOM).
*   **Cause:** `node-llama-cpp` by default eagerly initializes the best available backend (CUDA) even if `gpuLayers` is 0.
*   **Fix:** Workers MUST explicitly check for `GPU_LAYERS=0` in their `init()` sequence and pass `gpu: { exclude: ['cuda'] }` to the loading configuration.
*   **Rule:** "Zero means Zero". If the user requests 0 GPU layers, the CUDA backend should not even be loaded.