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

### 3. Context Assembly Findings (`specs/context_assembly_findings.md`)
*   **Role:** Document the critical findings from context assembly experiments showing retrieval layer bottlenecks.
*   **Format:** Analysis and recommendations.
*   **Content:** How retrieval layer optimization is more important than inference layer upgrades, with scaling recommendations for different model sizes.

### 4. Testing Standards (`TESTING_STANDARDS.md`)
*   **Role:** Document the comprehensive testing policy for the ECE project.
*   **Format:** Standards and policies for testing approach.
*   **Content:** Single point of truth for all testing through the comprehensive suite.

### 5. Cleanup Reports (`CLEANUP_REPORT.md`)
*   **Role:** Document codebase cleanup activities and improvements.
*   **Format:** Summary of cleanup actions taken.
*   **Content:** Details of test consolidation, duplicate file cleanup, and system improvements.

### 2. The Tracker (`specs/tasks.md`)
*   **Role:** Current work queue.
*   **Format:** Checklist.
*   **Maintenance:** Updated by Agents after every major task.

### 3. The Roadmap (`specs/plan.md`)
*   **Role:** Strategic vision.
*   **Format:** Phased goals.

### 4. Standards (`specs/standards/*.md`)
*   **Role:** Institutional Memory (The "Laws" of the codebase).
*   **Trigger:** Created after any bug that took >1 hour to fix OR any systemic improvement that affects multiple components.
*   **Format:** "The Triangle of Pain"
    1.  **What Happened:** The specific failure mode (e.g., "Bridge crashed on start").
    2.  **The Cost:** The impact (e.g., "3 hours debugging Unicode errors").
    3.  **The Rule:** The permanent constraint (e.g., "Force UTF-8 encoding on Windows stdout").

### 5. Root-Level Documents
*   **Role:** System-wide protocols and policies.
*   **Examples:** `SCRIPT_PROTOCOL.md`, `README.md`
*   **Purpose:** Critical system-wide protocols that apply to the entire project.

### 6. Local Context (`*/README.md`)
*   **Role:** Directory-specific context.
*   **Limit:** 1 sentence explaining the folder's purpose.

### 7. System-Wide Standards
*   **Universal Logging:** All system components must route logs to the central log collection system (Standard 013)
*   **Single Source of Truth:** The log viewer at `/log-viewer.html` is the single point for all system diagnostics
*   **Async Best Practices:** All async/await operations must follow proper patterns for FastAPI integration (Standard 014)
*   **Browser Control Center:** All primary operations must be accessible through unified browser interface (Standard 015)
*   **Detached Script Execution:** All data processing scripts must run in detached mode with logging to `logs/` directory (Standard 025)
*   **Never Attached Mode:** Long-running services and scripts must NEVER be run in attached mode to prevent command-line blocking (Standard 035 in 30-OPS)
*   **Script Running Protocol:** All long-running processes must execute in detached mode with output redirected to timestamped log files (Standard 035 in 30-OPS)
*   **Ghost Engine Connection Management:** All memory operations must handle Ghost Engine disconnections gracefully with proper error reporting and auto-reconnection (Standard 026)
*   **No Resurrection Mode:** System must support manual Ghost Engine control via NO_RESURRECTION_MODE flag (Standard 027)
*   **Default No Resurrection:** Ghost Engine resurrection is disabled by default, requiring manual activation (Standard 028)
*   **Consolidated Data Aggregation:** Single authoritative script for data aggregation with multi-format output (Standard 029)
*   **Multi-Format Output:** Project aggregation tools must generate JSON, YAML, and text outputs for maximum compatibility (Standard 030)
*   **Ghost Engine Stability:** CozoDB schema creation must handle FTS failures gracefully to prevent browser crashes (Standard 031)
*   **Ghost Engine Initialization Flow:** Database initialization must complete before processing ingestion requests to prevent race conditions (Standard 032)
*   **CozoDB Syntax Compliance:** All CozoDB queries must use proper syntax to ensure successful execution (Standard 033)
*   **Node.js Monolith Migration:** System must migrate from Python/Browser Bridge to Node.js Monolith architecture (Standard 034)
*   **Cortex Upgrade**: Local inference via `node-llama-cpp` for GGUF support (Standard 038)
*   **Multi-Bucket Schema**: Memories support multiple categories via `buckets: [String]` (Standard 039)
*   **Cozo Syntax Hardening**: Avoid `unnest` and complex list queries in CozoDB (Standard 040)
*   **Timed Background Execution**: Model development scripts must run with timers in background mode, directing output to logs (Standard 049)
*   **CozoDB Pain Points Reference**: Comprehensive gotchas and lessons learned for CozoDB queries (Standard 053)
*   **Side-Channel Summarization**: Context injections >50% of budget must be summarized via ephemeral sequence (Standard 054)
*   **Unified Data Ingestion**: All data enters via context/ directory, API, or backup restore with automatic deduplication (QUICKSTART.md)
*   **Sequential LLM Access Protocol**: All LLM access must go through a global request queue to prevent resource contention (Standard 055)
*   **LLM Access Serialization Implementation**: Complete audit and implementation of request queue for all LLM-accessing functions (Standard 056)
*   **Priority-Based Request Queue System**: Implement priority classification and scheduling for different types of requests (Standard 057)
## LLM Protocol
1. **Read-First:** Always read `specs/spec.md`, `SCRIPT_PROTOCOL.md`, AND `specs/standards/` before coding.
2. **Drafting:** When asked to document, produce **Mermaid diagrams** and short summaries.
3. **Editing:** Do not modify `specs/doc_policy.md` or `specs/spec.md` structure unless explicitly instructed.
4. **Archival:** Move stale docs to `archive/` immediately.
5. **Enforcement:** If a solution violates a Standard, reject it immediately.
6. **Standards Evolution:** New standards should follow the "Triangle of Pain" format and be numbered sequentially (001, 002, etc.).
7. **Cross-Reference:** When creating new standards, reference related existing standards to maintain consistency.
8. **Detached Mode:** All LLM development scripts must run in detached mode (non-interactive) and log to files in the `logs/` directory with timestamped names (Standard 025).

## Windows-Specific Considerations
1. **Safe Shell Execution:** On Windows, use the SafeShellExecutor for running commands to avoid console window issues.
2. **Command Output:** Due to Windows process creation behavior, command outputs may not appear in the current session when running background processes.
3. **Native Modules:** Windows may require additional build tools for native Node.js modules. Consider using prebuilt binaries or installing Visual Studio Build Tools.
4. **Path Handling:** Always use Node.js path utilities (`path.join`, `path.resolve`) for cross-platform compatibility.

---
*Verified by Architecture Council. Edits verified by Humans Only.*