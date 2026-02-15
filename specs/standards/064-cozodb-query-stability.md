# Standard 064: PGlite Query Structure & Stability (Formerly CozoDB)

**Status:** Active | **Category:** Database / Query Optimization
**Context:** PGlite (PostgreSQL-compatible) via native bindings.

## 1. Query Structure Best Practices

### A. Parameter Binding
Always use parameterized queries to prevent SQL injection:
*   ✅ Correct: `SELECT * FROM atoms WHERE content LIKE $1`
*   ❌ Incorrect: `SELECT * FROM atoms WHERE content LIKE '${userInput}'`

### B. Index Optimization
Use GIN indices for full-text search and JSON operations:
```sql
-- FTS Index
CREATE INDEX idx_atoms_content_gin ON atoms USING GIN(to_tsvector('simple', content));

-- JSON Index
CREATE INDEX idx_atoms_payload_gin ON atoms USING GIN (payload);
```

### C. Query Performance
*   **LIMIT Early:** Apply LIMIT clauses as early as possible in complex queries
*   **JOIN Strategy:** Use appropriate JOIN types (INNER vs LEFT vs RIGHT) based on data relationships
*   **Subquery Optimization:** Prefer CTEs over nested subqueries for readability and performance

## 2. Schema Evolution (The "Safe Migration")
Unlike CozoDB limitations, PGlite supports ALTER TABLE operations but requires careful planning:
*   **Protocol:** When schema changes are needed (e.g. adding `hash` column):
    1.  Create migration script with proper transaction handling
    2.  Test migration on backup copy first
    3.  Execute within transaction with rollback capability
    4.  Update application code to handle new schema
    5.  Verify data integrity after migration

## 3. Query Reliability
*   **Connection Pooling:** Use PGlite's built-in connection pooling for concurrent operations
*   **Transaction Management:** Wrap related operations in transactions for consistency
*   **Error Handling:** Implement retry logic for transient database errors

## 4. Full-Text Search (FTS) Optimization
PGlite provides robust FTS capabilities with PostgreSQL compatibility:

### A. Basic FTS Query
```sql
SELECT *, ts_rank(to_tsvector('simple', content), plainto_tsquery('simple', $1)) as rank
FROM atoms 
WHERE to_tsvector('simple', content) @@ plainto_tsquery('simple', $1)
ORDER BY rank DESC;
```

### B. Advanced FTS with Weights
```sql
SELECT *, ts_rank_cd(
    setweight(to_tsvector('simple', content), 'A') ||
    setweight(to_tsvector('simple', tags), 'B'),
    plainto_tsquery('simple', $1)
) as rank
FROM atoms
WHERE 
    (setweight(to_tsvector('simple', content), 'A') ||
     setweight(to_tsvector('simple', tags), 'B')) @@ plainto_tsquery('simple', $1)
ORDER BY rank DESC;
```

## 5. JSON/JSONB Operations
PGlite supports full PostgreSQL JSON operations:

### A. JSON Querying
```sql
-- Query JSON fields
SELECT * FROM atoms WHERE payload->>'type' = $1;

-- JSON existence check
SELECT * FROM atoms WHERE payload ? $1;

-- JSON path queries
SELECT * FROM atoms WHERE payload @> $1;  -- Contains operator
```

### B. JSON Indexing
```sql
-- GIN index for JSON operations
CREATE INDEX idx_atoms_payload_gin ON atoms USING GIN (payload jsonb_path_ops);
```

## 6. Performance Monitoring
*   **EXPLAIN ANALYZE:** Use to understand query execution plans
*   **Index Usage:** Monitor index hit rates and effectiveness
*   **Query Caching:** Leverage PGlite's query plan caching for repeated queries

## 7. Migration from Legacy Systems
When migrating from CozoDB or other systems:
*   **Data Mapping:** Map CozoDB relations to PostgreSQL tables
*   **Query Translation:** Convert Datalog queries to SQL equivalents
*   **Index Recreation:** Recreate appropriate indices for PostgreSQL
*   **Validation:** Verify data integrity and query results after migration