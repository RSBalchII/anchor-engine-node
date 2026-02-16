# Standard 105: Elastic Context & Fuzzy Search Protocol

**Status:** Active  
**Type:** Core Feature  
**Created:** 2026-02-10  
**Context:** Semantic Search Scaling & Robustness

## 1. Overview

This standard defines the "Elastic Context" scaling logic and "Fuzzy Search" capabilities implemented to resolve issues with rigid context windows and typo sensitivity. It ensures that the Anchor Engine delivers **maximum useful context** while remaining **robust against user input errors**.

## 2. Elastic Context (Dynamic Scaling)

### 2.1 The Problem
Fixed-radius search strategies fail to adapt to query density.
- **Narrow queries** (e.g., "limerance") returned tiny context snippets (~120 chars) despite having a massive token budget.
- **Broad queries** (e.g., "the") would flood the context window with irrelevant noise.

### 2.2 The Solution: Hit-Based Scaling
Instead of a pre-defined radius, the search radius is calculated **dynamically** based on the scarcity of the term.

**Formula:**
```typescript
ElasticRadius = Clamp(
    GlobalBudget / TotalHits / 2, 
    Min: 200 bytes, 
    Max: 32000 bytes
)
```

- **Few Hits (Rare Term):** The system maximizes the window (up to ~32k chars), providing **Atomic Molecules** (full chapters/documents).
- **Many Hits (Common Term):** The system shrinks the window (down to ~200 chars), providing **dense, focused snippets**.

### 2.3 Implementation
- **Phase 1 (Census):** `ContextInflator.getAtomLocations` scans the index to count total potential hits matching the terms.
- **Phase 2 (Calculation):** The `ElasticRadius` is computed using the total hit count and the user's `max_chars` budget.
- **Phase 3 (Inflation):** Content is hydrated from disk using the calculated dynamic radius.

## 3. Fuzzy Search Algorithm

### 3.1 The Problem
Strict keyword matching (`LOWER(atom) = LOWER(term)`) is brittle. A single typo (e.g., "conciousness" vs "consciousness") causes the primary search to fail, often falling back to generic terms (like "machine") and returning irrelevant results.

### 3.2 The Solution: `pg_trgm` & Prefix Caching
We allow for "fuzzy" matching to catch typos and variations.

**Logic:**
1. **Exact Match:** `atom_label = term` (Highest priority)
2. **Prefix Match:** `atom_label LIKE 'term%'` (High priority)
3. **Trigram/Fuzzy Match:** `atom_label % term` (using `pg_trgm` extension)

**SQL Implementation:**
```sql
SELECT ... FROM atom_positions 
WHERE 
   LOWER(atom_label) = LOWER($1) 
   OR atom_label ILIKE $2  -- Fuzzy/Prefix match
```

### 3.3 Dependencies
- **PostgreSQL Extension:** `CREATE EXTENSION IF NOT EXISTS pg_trgm;` enabled in `db.ts`.

## 4. Constraint Handling

- **Max Radius:** Hard cap at **32,000 bytes** to prevent memory overflows during hydration.
- **Min Radius:** Hard floor at **200 bytes** to ensure readability.
- **Budget Respect:** The system strictly respects the `max_chars` limit passed by the user/agent.

## 5. Verification
- **Fidelity:** Queries with typos should now return the correct semantic cousins.
- **Scale:** Queries with 12k+ token budgets should return massive, coherent blocks of text (not fragmented sentences).
