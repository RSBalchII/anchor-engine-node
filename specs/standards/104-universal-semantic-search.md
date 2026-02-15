# Standard 104: Universal Semantic Search Protocol

**Status:** ACTIVE
**Date:** 2026-02-10
**Supersedes:** Standard 094 (Smart Search), Standard 086 (Tag-Walker Calibration)
**Component:** Engine / Search Service

## 1. Executive Summary
This standard establishes the **Universal Semantic Search** architecture, which unifies all search operations under a single, permissive, and context-aware strategy. It explicitly **deprecates** the "Strict Anchor Search" (Phase 2 of Standard 094) in favor of a "Semantic-First" approach that prioritizes recall and relevance over exact keyword matching.

## 2. Core Problem & Resolution

### The Issue (Legacy Standard 094)
The previous protocol enforced a "Strict Anchor Phase" (AND logic) as the primary search method. This caused:
*   **Brittleness**: Queries with typos ("conciousness") or conceptual sequencing returned 0 results.
*   **Context Instability**: Fallback mechanisms often failed to trigger or returned irrelevant "fluff" to fill token budgets.
*   **Memory Pressure**: Inefficient "Budget Filling" logic pulled in massive file headers/random atoms.

### The Resolution (Standard 104)
We have removed the conditional "Strict" path. All queries now execute via `executeSemanticSearch`, which utilizes:
*   **Logical OR** by default (forgiveness for typos).
*   **Smart Scoring** to bubble up "AND" matches (intersection boosting) without filtering out "OR" matches.
*   **Adaptive Context Inflation** (Deep/Broad) to maximize budget efficiency.

## 3. Architecture

### 3.1. Universal Route
All user queries to `/v1/memory/search` are routed to `services/semantic/semantic-search.ts`. The legacy `search.ts` service is retained *only* for internal, non-fuzzy tooling looks.

### 3.2. Distributed Budgeting (70/30 Split)
To balance "Deep Context" (reading full segments) with "Broad Context" (seeing connections), the token budget is strictly partitioned:

*   **70% Primary Budget (Deep Context)**
    *   **Target**: Direct keyword matches.
    *   **Radius**: Dynamic & Adaptive (scales with budget, typically >500 bytes).
    *   **Goal**: Provide the *substance* of the answer.

*   **30% Associative Budget (Broad Context)**
    *   **Target**: Related terms (synonyms, semantic neighbors).
    *   **Radius**: Fixed Small (150 bytes).
    *   **Goal**: Provide *breadth* and serendipity (3-5 distinct snippets).

### 3.3. Smart Content Weighting
The system auto-classifies content types to respect user intent:
*   **Standard Mode**: Code and Narrative are treated equally.
*   **Narrative Mode** (default):
    *   **Penalize**: `#Code`, `#Log`, `#JSON`, `#Technical` (Score * 0.1).
    *   **Protect**: Content with `#Narrative`, `#Chat`, or conversational markers (`User:`, `Assistant:`), *even if* it contains code.
    *   **Rationale**: Prevents massive log dumps from drowning out human insights.

## 4. Implementation Details

### Context Inflation (Lazy Molecule)
*   **No "Budget Filling"**: The system no longer fetches random atoms to fill the prompt. If the relevant results use only 200 tokens, it returns only 200 tokens.
*   **Empty Filtering**: Inflated windows containing only whitespace or "..." are strictly filtered out.

### API Contract
```typescript
interface SearchOptions {
  query: string;
  code_weight?: number; // 0.1 (default for chat) or 1.0 (explicit code search)
  provenance?: 'all' | 'internal' | 'external';
}
```

## 5. Migration Guide
*   **Developers**: Stop using `executeSearch` or `tagWalkerSearch`. use `executeSemanticSearch`.
*   **Prompt Engineers**: No longer need to prompt "fuzzy" or "broad" queries. The engine handles this automatically.
