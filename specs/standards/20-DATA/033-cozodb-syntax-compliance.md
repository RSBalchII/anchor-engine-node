# Standard 033: CozoDB Schema and Query Syntax Compliance

## What Happened?
The Ghost Engine was experiencing continued ingestion failures due to incorrect CozoDB query syntax. Issues included:
- Incorrect schema creation syntax with improper line breaks
- Wrong insertion query syntax (`:put` vs `:insert`)
- Improper parameter formatting for data insertion
- Schema validation that didn't properly propagate failure status

## The Cost
- Persistent ingestion failures despite initialization flow fixes
- Incorrect CozoDB query syntax causing "Unknown error" messages
- Failed schema creation preventing proper database operations
- Misleading success messages when operations were actually failing
- Continued inconsistency between Bridge and Ghost Engine logs

## The Rule
1. **Schema Creation Syntax**: Use proper CozoDB schema creation syntax without line breaks in the schema definition: `:create memory {id: String => timestamp: Int, content: String, source: String, type: String} if not exists;`

2. **FTS Creation Syntax**: Use proper CozoDB FTS creation syntax: `::fts create memory:content_fts {extractor: content, tokenizer: Simple, filters: [Lowercase]} if not exists;`

3. **Insert Query Syntax**: Use `:insert` or `:replace` with proper parameter binding syntax: `:insert memory {id, timestamp, content, source, type} <- $data`

4. **Parameter Formatting**: Format parameters correctly as nested arrays for bulk operations: `{data: [[id, timestamp, content, source, type]]}`

5. **Schema Validation**: Properly propagate schema creation success/failure status to prevent operations on uninitialized database

6. **Error Propagation**: Ensure all database operations properly handle and report errors to maintain consistency between Bridge and Ghost Engine

## Implementation
- Fixed schema creation queries to use correct CozoDB syntax without line breaks
- Updated insertion queries from `:put` to `:insert` with proper syntax
- Corrected parameter formatting for data insertion operations
- Enhanced schema validation to properly return success/failure status
- Improved error propagation throughout database operations
- Maintained backward compatibility while fixing syntax issues