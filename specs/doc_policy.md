# Documentation Policy (Root Coda)

**Status:** Active | **Authority:** Human-Locked

## Core Philosophy
1. **Code is King:** Code is the only source of truth. Documentation is a map, not the territory.
2. **Visuals over Text:** Prefer Mermaid diagrams to paragraphs.
3. **Brevity:** Text sections must be <500 characters.
4. **Pain into Patterns:** Every major bug must become a Standard.
5. **LLM-First Documentation:** Documentation must be structured for LLM consumption and automated processing.

## Structure

### 1. The Blueprint (`specs/spec.md`)
*   **Role:** The single architectural source of truth.
*   **Format:** "Visual Monolith".
*   **Content:** High-level diagrams (Kernel, Memory, Logic, Bridge). No deep implementation details.

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

## LLM Protocol
1. **Read-First:** Always read `specs/spec.md`, `SCRIPT_PROTOCOL.md`, AND `specs/standards/` before coding.
2. **Drafting:** When asked to document, produce **Mermaid diagrams** and short summaries.
3. **Editing:** Do not modify `specs/doc_policy.md` or `specs/spec.md` structure unless explicitly instructed.
4. **Archival:** Move stale docs to `archive/` immediately.
5. **Enforcement:** If a solution violates a Standard, reject it immediately.
6. **Standards Evolution:** New standards should follow the "Triangle of Pain" format and be numbered sequentially (001, 002, etc.).
7. **Cross-Reference:** When creating new standards, reference related existing standards to maintain consistency.
8. **Detached Mode:** All LLM development scripts must run in detached mode (non-interactive) and log to files in the `logs/` directory with timestamped names (Standard 025).

---
*Verified by Architecture Council. Edited by Humans Only.*
