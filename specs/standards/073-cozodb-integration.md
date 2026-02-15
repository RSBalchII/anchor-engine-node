# Standard 073: CozoDB Integration for Graph-Relational-Vector-FTS Engine

**Category:** Architecture / Persistence
**Status:** Active
**Date:** 2026-01-31

## Context
The ECE system requires a unified storage solution that can handle graph relationships, relational data, vector operations, and full-text search simultaneously. CozoDB provides this unified engine with RocksDB backend for local-first performance.

## Core Architecture

### Integration Architecture
The `cozo-node` package is a native addon that provides direct access to CozoDB's graph-relational-vector-fts engine:

- `open_db()` - Creates a database instance and returns a database ID
- `query_db()` - Executes queries against a database using its ID
- `close_db()` - Closes the database connection

### Function-Based Interface
Unlike class-based databases, CozoDB uses individual functions with database IDs:
- **Database ID Management**: Essential for connection pooling and resource management
- **Memory Management**: Database connections require explicit cleanup to prevent leaks
- **Query Patterns**: CozoDB uses Datalog queries with FTS extensions for semantic search

## Schema Design

### Atomic Architecture Tables
The system implements the atomic taxonomy with four core tables:

#### 1. Compounds Table
```cozo
:create compounds {
  id: String
  =>
  compound_body: String,
  path: String,
  timestamp: Float,
  provenance: String,
  molecular_signature: String,
  atoms: [String],
  molecules: [String],
  embedding: <F32; 384>
}
```

#### 2. Molecules Table
```cozo
:create molecules {
  id: String
  =>
  content: String,
  compound_id: String,
  sequence: Int,
  start_byte: Int,
  end_byte: Int,
  type: String,
  numeric_value: Float ?,
  numeric_unit: String ?,
  molecular_signature: String,
  embedding: <F32; 384>
}
```

#### 3. Atoms Table
```cozo
:create atoms {
  id: String
  =>
  label: String,
  type: String,
  weight: Float,
  embedding: <F32; 384>
}
```

#### 4. Atom Edges Table
```cozo
:create atom_edges {
  from_id: String,
  to_id: String
  =>
  weight: Float,
  relation: String
}
```

### Core Memory Table
```cozo
:create memory {
  id: String
  =>
  timestamp: Float,
  content: String,
  source: String,
  source_id: String,
  sequence: Int,
  type: String,
  hash: String,
  buckets: [String],
  epochs: [String],
  tags: [String],
  provenance: String,
  simhash: String,
  embedding: <F32; 384>
}
```

### Supporting Tables
- **Source Table**: Container for file-level metadata
- **Summary Node Table**: Episode/epoch-level abstractions
- **Parent_Of Edge Table**: Hierarchical relationships
- **Engrams Table**: Lexical sidecar for fast entity lookup

## Indexing Strategy

### Full-Text Search (FTS) Indices
```cozo
::fts create memory:content_fts {
  extractor: content,
  tokenizer: Simple,
  filters: [Lowercase]
}

::fts create molecules:content_fts {
  extractor: content,
  tokenizer: Simple,
  filters: [Lowercase]
}
```

### Performance Indices
Critical indices for tag and bucket filtering:
- `memory:buckets` - Index for bucket-based filtering
- `memory:tags` - Index for tag-based filtering
- `memory:epochs` - Index for temporal filtering

## Query Patterns

### Tag-Walker Anchor Query
```cozo
?[id, content, source, timestamp, buckets, tags, epochs, provenance, score, sequence, molecular_signature, start_byte, end_byte, type, numeric_value, numeric_unit, compound_id] :=
~memory:content_fts{id | query: $query, k: $anchorLimit, bind_score: fts_score},
*molecules{id, start_byte, end_byte, type, numeric_value, numeric_unit, compound_id},
*memory{id, content, source, timestamp, buckets, tags, epochs, provenance, sequence, simhash},
provenance != 'quarantine',
score = 70.0 * fts_score,
molecular_signature = simhash
:limit $anchorLimit
```

### Tag-Walker Walk Query
```cozo
?[id, content, source, timestamp, buckets, tags, epochs, provenance, score, sequence, molecular_signature, start_byte, end_byte, type, numeric_value, numeric_unit, compound_id] :=
*memory{id: anchor_id, tags: anchor_tags},
anchor_id in $anchorIds,
tag in anchor_tags,
*memory{id, content, source, timestamp, buckets, tags, epochs, provenance, sequence, simhash},
*molecules{id, start_byte, end_byte, type, numeric_value, numeric_unit, compound_id},
tag in tags,
id != anchor_id,
provenance != 'quarantine',
molecular_signature = simhash,
score = 30.0
:limit $walkLimit
```

## Error Handling & Recovery

### Auto-Purge Protocol (Standard 083)
The system implements automatic recovery for database corruption:

1. **Detection**: Identify lock file, IO errors, or invalid arguments
2. **Purge**: Remove corrupted database files
3. **Recovery**: Reinitialize database with existing schema
4. **Verification**: Ensure all tables and indices are recreated

### Graceful Degradation
- **Fallback Mechanisms**: If CozoDB unavailable, use mock database
- **Stateless Mode**: Engine continues operating with reduced functionality
- **Retry Logic**: Automatic retry with exponential backoff

## Performance Considerations

### Memory Management
- **Explicit Cleanup**: Always close database connections in finally blocks
- **Connection Pooling**: Use database ID management for efficient resource usage
- **Resource Monitoring**: Track memory usage patterns with database operations

### Query Optimization
- **Parameter Binding**: Use parameterized queries to prevent injection
- **Result Limiting**: Always apply limits to prevent excessive memory usage
- **Index Utilization**: Ensure queries leverage available indices

## Testing Approach

### Isolation Testing
- **Individual Operations**: Test database operations in isolation before integration
- **Query Validation**: Verify query patterns work with expected data structures
- **Connection Management**: Test connection lifecycle and cleanup
- **Error Path Validation**: Ensure error handling works correctly

### Integration Testing
- **End-to-End Workflows**: Test complete ingestion and retrieval workflows
- **Performance Benchmarks**: Measure query execution times and resource usage
- **Concurrency Testing**: Verify database operations work under load

## Platform-Specific Considerations

### Binary Management
- **Platform-Specific Binaries**: Different CozoDB binaries for Windows, macOS, Linux
- **Path Resolution**: Use PathManager for consistent binary location
- **Loading Fallbacks**: Implement robust loading with multiple fallback paths

### Cross-Platform Compatibility
- **Consistent Performance**: Ensure similar performance across platforms
- **File System Differences**: Account for path separators and permissions
- **Resource Limits**: Adapt to platform-specific memory and storage constraints