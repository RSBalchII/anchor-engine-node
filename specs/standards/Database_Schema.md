# Domain Standard: Database Schema & Operations

**Status:** LIVING | **Domain:** Database (PGlite)
**Maintained By:** Anchor Engine Team
**Last Updated:** 2026-02-10

## 1. Overview
Anchor uses **PGlite** (PostgreSQL in WASM/Node) for local, serverless storage. It replaces the legacy CozoDB (Standard 053) to ensure strict SQL compatibility and type safety.

## 2. Core Schema
*   **Atoms**: Unstructured text segments + vector embeddings.
*   **Tags**: Semantic labels (JSON arrays in `TEXT[]` columns).
*   **Source**: File provenance.

## 3. The "Tabula Rasa" Pattern (Standard 095)
To prevent `EEXIST` errors and corruption:
*   **Startup**: The engine *proactively deletes* the database directory on every boot (configurable).
*   **Rehydration**: Fast re-ingestion from the file system (Source of Truth).
*   **Reasoning**: "Text is King." The DB is just a cache for the filesystem.

## 4. Type Handling Protocol (Standard 100)
PGlite has strict typing for arrays:
*   **`TEXT` Columns**: Must receive **JSON Strings** for arrays (e.g. `JSON.stringify(['a','b'])`).
*   **`TEXT[]` Columns**: Must receive **Raw Arrays** (e.g. `['a','b']`).

## 5. Security (Standard 099)
*   **Identifier Escaping**: All dynamic table/column names must be double-quoted (`"user_input"`) to prevent injection.
*   **Parameterization**: All values must use parameterized queries (`$1, $2`).
