# Standard 100: PGlite Type Handling Protocol

**Status:** Active | **Authority:** Human-Locked | **Domain:** Database

## Problem Statement
PGlite 0.2.0 changed array handling behavior. TEXT columns require JSON strings, TEXT[] columns require raw arrays.

## Type Handling Rules

### TEXT Columns (e.g., `atoms`, `molecules`, `embedding` in compounds table)
```typescript
// CORRECT: JSON stringify arrays for TEXT columns
atoms: Array.isArray(row[6]) ? JSON.stringify(row[6]) : (row[6] || '[]')
```

### TEXT[] Columns (e.g., `buckets`, `tags` in atoms table)
```typescript
// CORRECT: Pass raw arrays for TEXT[] columns
buckets: Array.isArray(row[7]) ? row[7] : ['core']
tags: Array.isArray(row[8]) ? row[8] : []
```

## Key Differences

| Column Type | Input | Transform |
|-------------|-------|-----------|
| TEXT | Array | `JSON.stringify(arr)` |
| TEXT[] | Array | Pass raw `arr` |
| TEXT | String | Pass as-is |
| TEXT[] | String | `[str]` or parse |

## Error Signatures
- `Invalid input for string type` → Wrong array passed to TEXT column
- `malformed array literal` → JSON string passed to TEXT[] column

## Key Commits
- `ab385f7` - pglite 0.2.0 compatibility fixes

## Affected Files
- `engine/src/services/ingest/ingest-atomic.ts`
