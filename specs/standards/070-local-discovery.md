# Standard 070: Local Discovery (NER Standardization)

**Status:** Active | **Domain:** 20: DATA | **Relevant Services:** Tags, Dreamer

## 1. Core Philosophy (The "Teacher" Role)
The system uses a "Teacher-Student" architecture for entity discovery:
*   **The Teacher (CPU-Local)**: A fast, free, local model scans all incoming content to find potential entities (tags).
*   **The Student (LLM)**: Takes these rough tags, refines them, and "infects" the graph via weak supervision.

To ensure the "Teacher" is always available and free, it MUST run on the CPU without blocking the main event loop.

## 2. Model Selection (Transformers.js)
We use `transformers.js` with the `token-classification` pipeline.

### Primary Model: `Xenova/bert-base-NER`
*   **Type:** Quantized ONNX
*   **Size:** ~100MB
*   **Performance:** ~20-50ms per sentence on modern CPUs.
*   **Output:** Standard CONLL labels (`B-PER`, `I-ORG`, `B-LOC`, `I-MISC`).

### Fallback Model: `Xenova/bert-base-multilingual-cased-ner-hrl`
*   **Use Case:** If the primary model fails to download or load.
*   **Capabilities:** Better multilingual support, slightly larger/slower.

## 3. Supported Entity Types
The BERT NER models standardizes on 4 core entity types:
1.  **PER (Person)**: Names of people (e.g., "Sam Altman", "Elon").
2.  **ORG (Organization)**: Companies, institutions (e.g., "OpenAI", "Google").
3.  **LOC (Location)**: Cities, countries, landmarks (e.g., "San Francisco", "Mars").
4.  **MISC (Miscellaneous)**: Events, products, works of art.

## 4. Implementation Rules
1.  **No Native Dependencies:** You MUST disable `sharp` and native ONNX bindings in the `env` config to prevent Windows build failures.
2.  **Quantization:** Always use `quantized: true` to minimize memory usage (~400MB RAM -> ~100MB RAM).
3.  **Graceful Fallback:** If *both* local models fail, the system MUST return an empty list `[]`. The "Dreamer" will then automatically default to the main LLM (The "Failsafe") for that cycle. It must never crash the engine.
