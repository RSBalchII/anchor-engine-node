# Standard 059: Reliable Ingestion (The "Ghost Data" Protocol)

**Status:** Active
**Trigger:** Ingestion API returning 200 OK while failing to persist data to CozoDB.

## 1. The Pain (Ghost Data & Silent Failures)
*   **symptom:** The `POST /v1/ingest` endpoint returned `200 OK` with a valid ID, but the data was never written to the database.
*   **Cost:** 6 hours of debugging search logic logic when ingestion was the root cause.
*   **Risk:** Silent data loss. Users believe memories are saved when they are discarded.

## 2. The Solution (Trust but Verify)
1.  **Read-After-Write (RAW):** Every ingestion operation MUST perform a read query immediately after the write operation, *within the same request scope*, to verify persistence.
    *   *Implementation:* insert `?[count] := *memory{id}, count(id)` or `?[id] := *memory{id}, id = $id`
2.  **Count Validation:** The API MUST NOT return `200 OK` unless the Verification Count > 0 (or specifically matches expected count).
3.  **Explicit Failure:** If verification fails, the API MUST return `500 Internal Server Error` with a standard error code (`INGEST_VERIFY_FAILED`).
4.  **Logging:** The Verification Count must be logged to the critical path log (Console or File) with the prefix `[INGEST_VERIFY]`.

## 4. Schema Alignment
*   **Strict Column Order:** CozoDB's `<- $data` insertion is positional. The API array order MUST match the `::columns memory` order exactly.
*   **Migration Integrity:** Any schema change (adding columns) requires a corresponding update to the `ingest.ts` data array *and* a verified migration of existing data using the Safe Restart Protocol.
*   **Nuclear Fallback:** If automated migration fails persistently (e.g. index locks) and data volume is zero or recoverable (inbox-based), the system MAY auto-reset the database (delete/recreate) to ensure service availability.

## 5. Metadata Mandatory
*   **Source ID:** `source_id` is mandatory for all atoms.
*   **Sequence:** `sequence` is mandatory (default 0).
## 6. The Cleanup Protocol (Encoding & Sanitization)
*   **Null Byte Stripping:** Ingested content MUST be scrubbed of null bytes (`\x00`) and replacement characters (`\uFFFD`). These cause `node-llama-cpp` tokenizer to bloat text significantly (1 char -> multiple tokens), leading to context overflows.
*   **BOM Detection:** The system MUST detect UTF-16 LE/BE Byte Order Marks (BOM) and decode buffers accordingly before processing.
*   **Strict Truncation:** To preserve system stability, embedding workers MUST truncate inputs to a safe factor of the context window (Recommended: `1.2 * ContextSize` characters) to prevent OOM or logic crashes on dense inputs (e.g., minified code).

## 7. The Inbox Zero Protocol (Recursive Ingestion)
*   **Recursive Scanning:** The Ingestion Engine MUST scan subdirectories within the `inbox/` folder.
*   **Smart Bucketing:**
    *   Files at `inbox/root.md` -> Bucket: `inbox`.
    *   Files at `inbox/project-a/note.md` -> Bucket: `project-a`.
    *   *Purpose:* This allows users to pre-organize content without it getting lost in a generic "inbox" tag.
*   **Transient Tag Cleanup:** The "inbox" tag is considered transient. The Dreamer/Organization Agents MUST remove the `inbox` tag after processing/tagging, but MUST preserve specific subfolder tags (e.g. `project-a`) to respect user intent.
