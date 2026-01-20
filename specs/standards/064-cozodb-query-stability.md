# Standard 064: CozoDB Query Structure & Stability

**Category:** Engineering / Database
**Status:** Draft
**Date:** 2026-01-19

## Context
Complex Datalog queries, especially those involving `~memory:content_fts` (Full Text Search) and `~memory:knn` (Vector Search), have demonstrated instability in the Node.js environment. This manifests as opaque parser errors (`unexpected input`, `coercion_failed`).

## Guidelines

### 1. Query Simplicity
- **Avoid Multiline Literals**: Where possible, keep queries single-line or strictly sanitized. Invisible newline characters in template literals can cause parser desync.
  - **Bad**:
    ```typescript
    const q = `?[a, b] :=
       *table{a, b}`;
    ```
  - **Good**:
    ```typescript
    const q = `?[a, b] := *table{a, b}`;
    ```

### 2. Variable Naming
- Avoid variable names that collide with column names in complex projections if not strictly necessary. 
- Use distinct logic variables (e.g., `cont` vs `content`) during `bind` operations to prevent ambiguity.

### 3. Vector & FTS Isolation
- Do not assume `Promise.all` parallel execution of FTS and Vector queries is safe on the single `db` instance lock. 
- **Sequential Execution**: If instability persists, run queries sequentially rather than in parallel.
- **Graceful degradation**: Always wrap vector/FTS queries in independent `try/catch` blocks. If one fails, the other should still return results.

### 4. Parameter Binding
- Always use `$param` binding for user input to prevent injection and parser errors.
- **Sanitization**: Violently sanitize inputs for FTS. FTS parsers are fragile with symbols like `:`, `*`, `-`.

## Implemented Workarounds (Current Codebase)
- Vector Search is currently **DISABLED** in `services/search/search.ts` via `Promise.resolve([])`.
- FTS Queries are **Single-Line**.
