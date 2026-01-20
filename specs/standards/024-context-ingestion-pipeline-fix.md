# Standard 024: Context Ingestion Pipeline - Field Name Alignment Protocol

## What Happened?
The context ingestion pipeline was failing silently due to field name mismatches between the watchdog service and the ghost engine. The watchdog was sending `filetype` but the memory ingestion endpoint expected `file_type`, and the ghost engine was looking for `msg.filetype` instead of `msg.file_type`. This caused the database to appear empty even though files were being processed, resulting in failed context searches.

## The Cost
- 2+ hours spent debugging why context files weren't appearing in the database
- Confusion from "Database appears empty!" messages in ghost engine logs
- Failed context searches returning no results despite files existing in context directory
- Misleading "Ingested" messages in watchdog logs that masked the actual field name mismatch
- Users experiencing broken context retrieval functionality

## The Rule
1. **Field Name Consistency**: All components in the ingestion pipeline must use consistent field names:
   - Watchdog sends: `file_type`, `source`, `content`, `filename`
   - Bridge expects: `file_type`, `source`, `content`, `filename`
   - Ghost engine receives: `file_type`, `source`, `content`, `filename`

2. **Payload Validation**: Always validate that field names match across the entire pipeline:
   ```javascript
   // In ghost.html handleIngest function
   await runQuery(query, {
       data: [[id, ts, msg.content, msg.source || msg.filename, msg.file_type || "text"]]
   });
   ```

3. **Source Identification**: The watchdog must send a proper source identifier instead of relying on default "unknown" values

4. **Error Reporting**: Include detailed error messages when ingestion fails to help with debugging