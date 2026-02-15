# Standard 058: UniversalRAG API & Modality-Aware Search

**Status:** Active | **Type:** Architectural Constraint | **Created:** 2026-01-16

## The Triangle of Pain

1.  **What Happened:** The initial search API (`GET /v1/memory/search`) relied on URL parameters, making it impossible to support complex RAG queries involving modality routing (Buckets) and provenance filtering. Additionally, native database exports proved opaque and brittle, risking data lock-in.
2.  **The Cost:** Agent confusion ("wobbling") due to ambiguous "legacy support" directives, inability to implement "Deep Research" features, and risk of losing historical context if the database engine changes.
3.  **The Rule:** 
    *   **Strict POST:** All semantic search operations MUST use `POST /v1/memory/search` with a structured JSON body conforming to the `SearchRequest` interface.
    *   **Universal Context Routing:** "Buckets" are strictly mapped to "Modalities" (e.g., `@code`, `@memory`, `@visual`).
    *   **Sovereign Dump:** Backups MUST be human-readable JSON streams (`GET /v1/backup`), never binary database exports.

## The Standard

### 1. UniversalRAG Interface
The search endpoint is the "Central Nervous System" of the engine. It does not just "look up keywords"; it routes intent.

```typescript
export interface SearchRequest {
  query: string;           // Natural language intent
  limit?: number;          // Default: 20
  deep?: boolean;          // True = Trigger Dreamer/Epochal layers
  buckets?: string[];      // Modalities: ["@code", "@visual", "@memory"]
  provenance?: 'sovereign' | 'external' | 'all';
}
```

### 2. Modality Mapping
Buckets are not arbitrary folders. They define the *Type of Mind* required:
*   `@code` → Source code focus (`.ts`, `.py`, `.rs`). Prioritizes structural understanding.
*   `@memory` → Chat logs, Dreamer epochs, and episodic history. Prioritizes temporal continuity.
*   `@visual` → Image descriptions and spatial data.

### 3. Sovereign Backup Strategy
Data sovereignty means the user owns the format.
*   **Format:** Single JSON object.
*   **Structure:**
    ```json
    {
      "timestamp": "ISO-8601",
      "stats": { "memory_count": N, "engram_count": N },
      "memories": [ ... ],
      "engrams": [ ... ]
    }
    ```
*   **Portability:** This format is database-agnostic. It can be re-ingested into SQLite, Postgres, or a new CozoDB instance.

## Implementation Requirements
*   **Routes:** `POST /v1/memory/search`, `GET /v1/backup`
*   **Legacy Support:** `GET` search endpoints should redirect or instruct users to use `POST`.
*   **Streaming:** Chat interfaces (`/v1/chat/completions`) must support SSE (Server-Sent Events) for real-time feedback.
