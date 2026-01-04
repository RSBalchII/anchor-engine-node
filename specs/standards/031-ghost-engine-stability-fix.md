# Fix for Ghost Engine CozoDB Schema Issues

## Problem
The Ghost Engine in ghost.html is experiencing crashes due to schema creation failures:
- "Schema creation failed: undefined"
- "Test query failed: undefined"
- Browser crashes when reloading database

## Root Cause
The issue is in the `ensureSchema()` function in ghost.html. The schema creation query attempts to create both the main table and the FTS (Full Text Search) index in a single operation:

```javascript
const schemaQuery = `
:create memory {
    id: String =>
    timestamp: Int,
    content: String,
    source: String,
    type: String
} if not exists;

::fts create memory:content_fts {
    extractor: content,
    tokenizer: Simple,
    filters: [Lowercase]
} if not exists;
`;
```

If the FTS creation fails (which can happen with certain CozoDB WASM builds), the entire schema creation fails.

## Solution
Modify the `ensureSchema()` function to separate schema and FTS creation:

```javascript
// First, create the basic schema
async function ensureSchema() {
    // Create basic table first
    const basicSchemaQuery = `
    :create memory {
        id: String =>
        timestamp: Int,
        content: String,
        source: String,
        type: String
    } if not exists;
    `;

    try {
        const result = await db.run(basicSchemaQuery, "{}");
        const jsonResult = JSON.parse(result);

        if (jsonResult.ok) {
            log("SUCCESS", "Basic schema created successfully");
        } else {
            log(
                "ERROR",
                "Basic schema creation failed: " +
                    JSON.stringify(jsonResult.error),
            );
            return false;
        }
    } catch (e) {
        log("ERROR", "Basic schema operation failed: " + e.message);
        return false;
    }

    // Then, try to create FTS separately
    const ftsQuery = `
    ::fts create memory:content_fts {
        extractor: content,
        tokenizer: Simple,
        filters: [Lowercase]
    } if not exists;
    `;

    try {
        const ftsResult = await db.run(ftsQuery, "{}");
        const ftsJsonResult = JSON.parse(ftsResult);

        if (ftsJsonResult.ok) {
            log("SUCCESS", "FTS index created successfully");
        } else {
            log(
                "WARNING",
                "FTS creation failed (search will be limited): " +
                    JSON.stringify(ftsJsonResult.error),
            );
            // Don't return false here - basic functionality still works
        }
    } catch (e) {
        log(
            "WARNING", 
            "FTS creation failed (search will be limited): " + e.message
        );
        // Don't return false - basic functionality still works
    }

    return true;
}
```

## Additional Improvements
1. Better error handling in testQuery function
2. More robust database initialization with fallbacks
3. Improved error messages that don't return "undefined"

## Status
This fix needs to be manually applied to ghost.html in the tools/ directory.