# Documentation Policy (Root Coda)

**Status:** Active | **Authority:** Human-Locked

## Core Philosophy
1. **Code is King:** Code is the only source of truth. Documentation is a map, not the territory.
2. **Synchronous Testing:** EVERY feature or data change MUST include a matching update to the Test Suite.
3. **Visuals over Text:** Prefer Mermaid diagrams to paragraphs.
4. **Brevity:** Text sections must be <500 characters.
5. **Pain into Patterns:** Every major bug must become a Standard.
6. **LLM-First Documentation:** Documentation must be structured for LLM consumption and automated processing.
7. **Change Capture:** All significant system improvements and fixes must be documented in new Standard files.

## User-Facing Documentation

### `QUICKSTART.md` (Root) — **PRIMARY USER GUIDE**
*   **Role:** First-time user onboarding and daily workflow reference.
*   **Content:** Data ingestion methods, deduplication logic, backup/restore, search patterns.
*   **Audience:** New users, daily reference for workflow.
*   **Authority:** Canonical guide for how users interact with ECE.

### `README.md` (Root)
*   **Role:** Project overview, installation, and quick start.
*   **Content:** What ECE is, how to install, link to QUICKSTART.md.

## Data Ingestion Standards

### Unified Ingestion Flow
```
┌─────────────────────────────────────────────────────────────────┐
│  INPUT METHODS (All paths lead to CozoDB)                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Drop files → context/           (Watcher auto-ingests)       │
│  2. Corpus YAML → context/          (read_all.js output)         │
│  3. API POST → /v1/ingest           (Programmatic)               │
│  4. Backup restore → backups/       (Session resume)             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  DEDUPLICATION LAYER                                             │
├─────────────────────────────────────────────────────────────────┤
│  • Hash match → Skip (exact duplicate)                           │
│  • >80% Jaccard → Skip (semantic duplicate)                      │
│  • 50-80% Jaccard → New version (temporal folding)               │
│  • <50% Jaccard → New document                                   │
│  • >500KB → Reject (Standard 053: FTS poisoning)                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  CozoDB GRAPH → Mirror → context/mirrored_brain/                │
└─────────────────────────────────────────────────────────────────┘
```

### Corpus File Format (read_all.js output)
```yaml
project_structure: "C:/path/to/project"
files:
  - path: "src/index.js"
    content: "// file content..."
  - path: "README.md"
    content: "# Project..."
metadata:
  total_files: N
  timestamp: "ISO-8601"
```

### Ingestion Rules
1. **Max Content Size:** 500KB per file (Standard 053: CozoDB Pain Points)
2. **Auto-Bucketing:** Top-level folder name = bucket; root files → `pending`
3. **Corpus Detection:** Files with `project_structure:` + `files:` array are extracted
4. **Temporal Folding:** Search shows latest version, history timestamps collapsed

## Structure

### 1. The Blueprint (`specs/spec.md`)
*   **Role:** The single architectural source of truth.
*   **Format:** "Visual Monolith".
*   **Content:** High-level diagrams (Kernel, Memory, Logic, Bridge). No deep implementation details.

### 2. Search Patterns (`specs/search_patterns.md`)
*   **Role:** Document the new semantic search and temporal folding capabilities.
*   **Format:** Examples and usage guidelines.
*   **Content:** How to leverage semantic intent translation and temporal folding for optimal results.

## CozoDB Integration Challenges & Solutions

### Issue Description
During development, we encountered significant challenges integrating CozoDB with the ECE_Core project, particularly around the native module loading and ES module compatibility.

### Root Cause
The `cozo-node` package is a native addon that exports functions directly rather than a class. When importing in an ES module environment, the import syntax needs to be adjusted to handle the CommonJS module correctly.

### Solution Implemented
Instead of trying to instantiate a `CozoDb` class, we now use the individual functions exported by the module:
- `open_db()` - Creates a database instance and returns a database ID
- `query_db()` - Executes queries against a database using its ID
- `close_db()` - Closes the database connection

### Key Learnings
1. Native modules in Node.js environments can have compatibility issues between CommonJS and ES modules
2. The `cozo-node` package exports functions directly, not a class
3. Proper error handling is essential when working with native modules
4. The database ID system requires careful management to prevent memory leaks

### Testing Approach
Created `test-cozo.js` to verify the native module functionality independently before integrating into the main codebase.

### Prevention Measures
- Always test native module integrations in isolation first
- Verify the actual export structure of third-party modules
- Implement proper cleanup routines for database connections
- Add comprehensive error handling for native module failures

## NER Standardization (CPU-First Discovery)

### Issue Description
The "Teacher" component uses local AI to discover tags without calling the expensive LLM. Initially, we attempted to use GLiNER (Zero-Shot NER), but encountered significant compatibility issues with the `transformers.js` library and ONNX runtime.

### Root Cause
1.  **Unsupported Architecture:** GLiNER uses a custom architecture not natively supported by standard `transformers.js` pipelines.
2.  **Model Availability:** The ONNX community builds for GLiNER are fragmented and often failed to download or run reliably.
3.  **Dependency Hell:** Attempting to force GLiNER support triggered complex native dependency chains (Sharp/libvips) that are unstable on Windows.

### Solution Implemented
Switched the "Teacher" to a standard **BERT-based Named Entity Recognition (NER)** model (`Xenova/bert-base-NER`).

**Benefits:**
*   **Native Support:** Works out-of-the-box with `token-classification` pipeline.
*   **Stability:** No custom inference logic or "hacky" dependency overrides needed.
*   **Reliability:** The model is a staple of the Hugging Face ecosystem and extremely unlikely to disappear.

### Standard 070: Local Discovery
*   **Primary:** `Xenova/bert-base-NER` (Quantized ONNX)
*   **Fallback:** `Xenova/bert-base-multilingual-cased-ner-hrl`
*   **Failsafe:** Main LLM (Orchestrator) via "Tag Infection" prompts.

## Native Module Best Practices

### Core Principles
1. **Graceful Degradation**: Services should continue to function when native modules are unavailable
2. **Platform Compatibility**: Always test on target platforms before deployment
3. **Error Handling**: Implement fallback mechanisms for missing dependencies
4. **Documentation**: Record integration challenges and solutions for future reference

### Implementation Guidelines
- Use WASM/JavaScript alternatives when possible to avoid native compilation issues
- Implement try/catch blocks around native module operations
- Provide meaningful error messages and fallback behaviors
- Document platform-specific installation requirements
- Test error conditions and fallback paths regularly

### Key Learnings from Recent Issues
- Native modules can cause platform-specific issues that impact system stability
- Graceful error handling is essential for robust systems
- Proper documentation of integration challenges helps future development
- Fallback mechanisms ensure core functionality remains available
- Always verify the actual export structure of third-party modules before integration