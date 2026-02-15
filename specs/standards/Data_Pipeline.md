# Domain Standard: Data Pipeline

**Status:** LIVING | **Domain:** Data Ingestion & Processing
**Maintained By:** Anchor Engine Team
**Last Updated:** 2026-02-10

## 1. Overview
The Data Pipeline transforms raw files (Markdown, Code, logs) into semantic **Atoms** stored in CozoDB. It enforces strict reliability protocols ("Ghost Data" prevention) and applies intelligent tagging.

## 2. Reliable Ingestion (Standard 059)
To prevent silent data loss ("Ghost Data"):
*   **Read-After-Write (RAW)**: Every ingestion MUST explicitly verify the write by querying the DB immediately after insertion.
*   **Count Validation**: API returns `200 OK` ONLY if verification count > 0.
*   **Null Byte Stripping**: Inputs must be scrubbed of `\x00` to prevent tokenizer bloat.
*   **Streaming**: File reads >10MB MUST use streams.

## 3. Tag Infection Protocol (Standard 068)
We use a "Teacher-Student" Weak Supervision model to tag millions of atoms without GPU bottlenecks.
*   **The Teacher (Discovery)**: A smart model (GLiNER/BERT) studies 0.1% of data to find "Viral Patterns" (e.g., "DeepSeek", "Project X").
*   **The Student (Infection)**: `wink-nlp` applies these patterns to the remaining 99.9% via fast regex/string matching (<1ms/atom).
*   **Feedback Loop**: New discoveries define new virus signatures.

## 4. Enhanced Code Analysis (Standard 097)
Code files receive specialized processing:
*   **AST Parsing**: Language-aware parsing (TS, Py, RS).
*   **Symbol Resolution**: Tracks function definitions and cross-references.
*   **Privacy**: All analysis happens locally; no code is sent to cloud LLMs for indexing.

## 5. The Inbox Zero Protocol
*   **Recursive Scanning**: `inbox/` subdirectories become buckets (e.g., `inbox/project-a` -> `bucket:project-a`).
*   **Transient Tags**: The `inbox` tag is temporary and removed after processing, but subfolder structure is preserved.
