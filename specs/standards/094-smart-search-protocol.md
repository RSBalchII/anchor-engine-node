# Standard 094: Smart Search Protocol
> [!WARNING]
> **DEPRECATED**: See Standard 104 (Universal Semantic Search) for current implementation.

**Status:** DEPRECATED (Superseded by 104)
**Date:** 2026-02-03
**Component:** Engine / Search Service

## 1. Overview
The Smart Search Protocol (SSP) enhances the semantic search engine (Tag-Walker) with intelligent pre-processing and dynamic fallback mechanisms. It is designed to interpret natural language intent, strip conversational noise, and gracefully handle strict query failures.

## 2. Architecture
The search pipeline operates in four distinct phases:

### Phase 1: Intelligent Parsing (The "Fluff" Stripper)
The system employs `wink-nlp` to perform Part-of-Speech (POS) tagging and stopword removal.
- **Input:** "What do we know about revenue optimization summary"
- **Process:**
    - Detects temporal context ("last 2 months", "2025").
    - Removes stopwords ("what", "do", "know", "about").
    - Extracts high-value tokens (Nouns, Verbs, Adjectives).
- **Output:** `revenue optimization summary` (refined)

### Phase 2: Strict Anchor Search (GIN Optimized)
The refined query is executed against the PostgreSQL `atoms` table using a Generalized Inverted Index (GIN).
- **Index Definition:** `CASE INSENSITIVE`, `simple` dictionary.
- **Query Strategy:** Strict AND (`&`).
- **Optimization:** Matches `to_tsvector('simple', content) @@ to_tsquery('simple', 'revenue & optimization & summary')`.
- **Constraint:** All terms must be present.

### Phase 3: Fuzzy Fallback (The Safety Net)
If Phase 2 matches **zero atoms**, the system automatically disengages the strict constraint.
- **Trigger:** `Strict Results == 0`
- **Query Strategy:** Logical OR (`|`).
- **Optimization:** `to_tsquery('simple', 'revenue | optimization | summary')`
- **Rationale:** Retrieves partial matches (e.g., specific documents about "Revenue" even if "Optimization" is missing).

### Phase 4: Semantic Walk
Results from the Anchor Phase (Strict or Fuzzy) are used as seed nodes for the Graph Walk, pulling in related atoms via shared tags, bucket proximity, and temporal clustering.

## 3. Implementation Details
- **File:** `engine/src/services/search/search.ts`
- **Key Functions:** `parseNaturalLanguage`, `tagWalkerSearch`, `executeSearch`.
- **Database:** PGlite with `pg_trgm` and `tsvector` support.

## 4. Performance Tuning
- **GIN Index:** The `substring()` limit was removed (Standard 094 modification) to allow the GIN index to function on the full content body.
- ** DISTINCT Buckets:** The bucket retrieval API uses `SELECT DISTINCT` to efficiently enumerate available data partitions without memory overflow.

## 5. Usage
No special parameters are required. The fallback mechanism is automatic.
```json
POST /v1/memory/search
{
  "query": "revenue optimization summary",
  "token_budget": 4000
}
```
