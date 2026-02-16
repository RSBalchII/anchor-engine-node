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
*   **Timestamp:** `timestamp` is now context-aware following Standard 096, with priority: content-specific temporal markers > file modification time > ingestion time.

## 6. The Cleanup Protocol (Encoding & Sanitization)
*   **Null Byte Stripping:** Ingested content MUST be scrubbed of null bytes (`\x00`) and replacement characters (`\uFFFD`). These cause `node-llama-cpp` tokenizer to bloat text significantly (1 char -> multiple tokens), leading to context overflows.
*   **BOM Detection:** The system MUST detect UTF-16 LE/BE Byte Order Marks (BOM) and decode buffers accordingly before processing.
*   **Strict Truncation:** To preserve system stability, embedding workers MUST truncate inputs to a safe factor of the context window (Recommended: `1.2 * ContextSize` characters) to prevent OOM or logic crashes on dense inputs (e.g., minified code).

## 7. Enhanced Timestamp Assignment (Standard 096)
*   **Content Extraction:** Scan content for temporal markers (ISO dates, US dates, Month-Day formats) with regex patterns.
*   **File Inheritance:** Use source file modification time as default when no content-specific temporal data exists.
*   **Context Propagation:** Pass timestamps through atomic topology (Compound -> Molecule -> Atom).
*   **Fallback Chain:** Maintain ingestion time as ultimate fallback when neither content nor file timestamps are available.
*   **Temporal Diversity:** Enable chronological sorting that reflects actual content timeline rather than ingestion time.

## 8. The Inbox Zero Protocol (Recursive Ingestion)
*   **Recursive Scanning:** The Ingestion Engine MUST scan subdirectories within the `inbox/` folder.
*   **Smart Bucketing:**
    *   Files at `inbox/root.md` -> Bucket: `inbox`.
    *   Files at `inbox/project-a/note.md` -> Bucket: `project-a`.
    *   *Purpose:* This allows users to pre-organize content without it getting lost in a generic "inbox" tag.
*   **Transient Tag Cleanup:** The "inbox" tag is considered transient. The Dreamer/Organization Agents MUST remove the `inbox` tag after processing/tagging, but MUST preserve specific subfolder tags (e.g. `project-a`) to respect user intent.

## 8. The Infinite File Protocol (Streaming & Safety)
**Context**: Ingesting multi-megabyte files (logs, backups) causes Node.js memory spikes and Native Module segfaults if processed as a single string.
*   **Streaming First**: All file reads MUST use streams or chunked buffers, never `fs.readFile` for files > 10MB.
*   **Chunked Sanitization**: The "Key Assassin" (Scrubber) must operate on 1MB chunks, yielding cleaned segments to the Atomizer.
*   **Native Module Guardrails**:
    *   **Disable on Danger**: Native modules (C++) MUST be disabled or wrapped in strict try-catch blocks when processing complex nested structures (YAML/JSON) to prevent stack overflows.
    *   **JS Fallback**: A high-performance pure JavaScript fallback MUST be available for all native operations (Sanitization, Atomization, Fingerprinting).
*   **Database Truncation**: Search indexes (`tsvector`) have hard limits (1MB). Content written to the `atoms` search table MUST be truncated (e.g., 500KB), while the full content is preserved in the `compounds` table.

## 9. Database Type Safety Protocol (String Type Validation)
**Context**: During atomic ingestion, database operations were failing with "Invalid input for string type" errors due to mismatched data types being passed to PGlite queries.
*   **Type Validation**: All database insertion operations MUST validate data types before insertion, especially when using batch operations.
*   **Safe Conversion**: Complex data types (arrays, objects) MUST be converted to appropriate database formats (e.g., JSON strings for PGlite compatibility) before insertion.
*   **Fallback Values**: Operations MUST provide appropriate fallback/default values for missing or invalid data to prevent type errors.
*   **Embedding Serialization**: Embedding vectors MUST be serialized as JSON strings when stored in text/JSON columns to ensure PGlite compatibility.
*   **Array Handling**: Array-type columns (buckets, tags) MUST be properly serialized as JSON strings when required by the database schema.

## 10. Scalable Performance Protocol (O(1) Ingestion)
**Context**: Inserting atoms one-by-one (O(N)) causes exponential slowdowns with large files (e.g., books), locking the database.
*   **Atomic Transactions**: Ingestion of a file chunk (e.g., 50 atoms) MUST occur within a *single* database transaction (`BEGIN` -> `INSERT`s -> `COMMIT`).
*   **Bulk Operations**: Use `INSERT INTO ... VALUES (...), (...), (...)` syntax rather than looping prepared statements.
*   **Conflict Handling**: Use `ON CONFLICT DO NOTHING` or `DO UPDATE` within the bulk statement to gracefully handle duplicates without aborting the transaction.
*   **Performance Target**: Ingestion must remain O(1) relative to the startup overhead for `db.run`, regardless of chunk size (up to safe parameter limits).
