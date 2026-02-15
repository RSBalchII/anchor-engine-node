# Standard 063: CozoDB Syntax & Schema Patterns

**Status:** DEPRECATED | **Replaced by:** Standard 085 (PGlite Implementation)
**Context:** This standard has been deprecated as of the migration to PGlite (PostgreSQL-compatible) database. The system no longer uses CozoDB as of Standard 085 implementation.

## DEPRECATION NOTICE
This standard has been deprecated as of the migration to PGlite (PostgreSQL-compatible) database. The system no longer uses CozoDB as of Standard 085 implementation.

## Original Content (Historical Reference)

### 1. Syntax Criticals (The "Parser Traps")
The `cozo-node` parser was stricter/different than some Rust documentation implied.
1.  **Vector Columns:** MUST use angle brackets with dimensions.
    *   ✅ Correct: `embedding: <F32; 384>`
    *   ❌ Incorrect: `embedding: [F32; 384]`, `embedding: Float32Array`
2.  **Assignment Operator:** MUST be `<-` (no spaces).
    *   ✅ Correct: `... <- $data`
    *   ❌ Incorrect: `... < - $data` (Causes `eval::named_field_not_found`)
3.  **Insertion Verb:** Use `:put`.
    *   ✅ Correct: `:put memory { ... }`
    *   ❌ Risky: `:insert`, `:replace` (Behavior varies by version/context)

### 2. HNSW Index Creation
The `::index create` command was insufficient for HNSW. Use the dedicated `::hnsw` command.

```cozoql
::hnsw create memory:knn {
    dim: 384,
    m: 50,
    ef_construction: 200,
    fields: [embedding],
    dtype: F32,
    distance: L2
}
```

### 3. Schema Evolution (The "Safe Restart")
CozoDB did not support `ALTER TABLE` easily.
*   **Protocol:** If the schema changed (e.g. adding `hash` column):
    1.  Detect mismatch (Column count check).
    2.  **Explicitly Drop Indices:** `::index drop memory:idxname` (Failure to do this locked the table drop).
    3.  Drop Table: `:drop memory`.
    4.  Recreate Table with new Schema.
    5.  Recreate Indices.

### 4. Query Reliability
*   **Parameter Binding:** Always use `$var` binding.
    *   `?[id] := *memory{id}, id = $id`
*   **Read-After-Write:** See [Standard 059](059_reliable_ingestion.md).

### 5. HNSW Vector Search (Verified Protocol)
Vector search via `cozo-node` had strict, non-obvious requirements that differed from CLI usage.

#### A. Explicit Index Query
Do NOT use the `:vec_nearest` algorithm directly on the table (it forced a full table scan and had obscure syntax binding issues). Always query the Index.

*   ✅ **Clean & Fast (O(log n)):**
    ```typescript
    // Use the ~table:index format
    ?[id, dist] := ~memory:knn{id | query: vec($q), k: 100, ef: 200, bind_distance: d},
                   dist = d
    ```
*   ❌ **Slow & Error Prone (O(n)):**
    ```typescript
    ?[id, dist] := *memory{id, embedding}, :vec_nearest(embedding, $q, 100, dist)
    ```

#### B. Type Casting (The "List vs Vector" Trap)
JavaScript arrays (e.g. `[0.1, 0.2]`) passed as parameters (`$q`) were treated as *Lists* by Cozo. The HNSW index demanded a *Vector*.
You MUST explicitly cast the input using `vec()` inside the query.

*   ✅ Correct: `query: vec($queryVec)`
*   ❌ Error (`Expected vector, got List`): `query: $queryVec`

#### C. Mandatory Parameters
*   **`ef` (Expansion Factor):** This parameter was **REQUIRED** for HNSW index queries. Omitting it caused `Field 'ef' is required`.
    *   *Recommendation:* Set `ef` to `2 * k` (e.g., if k=100, ef=200).
*   **`k` (Limit):** Should be a literal integer or bound variable.

#### D. Output Variable Binding
When binding the calculated distance, use a **Logic Variable** (no `$`), not a Parameter (`$`).
*   ✅ Correct: `bind_distance: d` (where `d` is then used in projection)
*   ❌ Error (`Unexpected input`): `bind_distance: $d`