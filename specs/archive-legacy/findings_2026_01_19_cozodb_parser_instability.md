# Finding: CozoDB Query Parser Instability in Hybrid Search

**Date:** 2026-01-19
**Status:** Open
**Severity:** High
**Component:** Engine / Search Service / CozoDB Driver

## Description
During the implementation of "Sovereign Bias" and "UniversalRAG", persistent `coercion_failed` and `query parser unexpected input` errors were encountered when executing complex Datalog queries via the Node.js CozoDB driver (`cozo-node`).

Specifically, the FTS (Full-Text Search) query combined with Vector Search logic fails with:
```
Error: "The query parser has encountered unexpected input / end of input at 20..20"
```
This occurs even when the query syntax appears valid and identical queries pass in isolated test scripts (`test_fts_simple.ts`).

## Symptoms
- `runTraditionalSearch` fails consistently when imported into the full engine context.
- `vectorSearch` triggers `coercion_failed` or similar opaque errors.
- The error `20..20` suggests the parser chokes on the projection variables (e.g., `?[id, score, content...]`), possibly due to:
    1. Invisible character encoding issues in TypeScript template literals.
    2. Conflict with reserved keywords (though `content` worked in isolation).
    3. Memory corruption or uninitialized state in the `db` instance when running multiple heavy queries.

## Workaround / Resolution
To restore stable system functionality, we have implemented the following temporary measures:
1.  **Disabled Vector Search**: The `vectorSearch` call in `executeSearch` matches has been replaced with a `Promise.resolve([])` stub.
2.  **Simplified FTS Queries**: Search queries are restricted to single-line strings to minimize parser ambiguity.
3.  **Fallback Mechanism**: The system relies heavily on the `runTraditionalSearch` (FTS) and Engram (Lexical) layers until the driver instability is resolved.

## Impact
- Semantic retrieval (embedding-based) is currently inactive. Use `provenance` or `buckets` for filtering.
- "Dreamer" and "Recall" features relying on purely semantic matches may see reduced accuracy.
- "Sovereign Bias" logic remains implemented but operates only on FTS/Lexical results.

## Next Steps
- Investigate `cozo-node` binary compatibility with the current Node.js version.
- Re-enable Vector Search incrementally using simplified, isolated queries.
- Audit all Datalog queries for template literal normalization.
