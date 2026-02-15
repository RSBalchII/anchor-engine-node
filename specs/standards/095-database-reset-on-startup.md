# Standard 095: Database Reset on Startup Protocol (The "Tabula Rasa" Pattern)

**Status:** Active | **Topic:** Database Initialization & Clean State Management

## 1. The Problem: Database Directory Conflicts
During system startup, PGlite encounters directory creation conflicts when the database directory already exists, causing startup failures with `EEXIST: file already exists` errors.

**Symptoms:**
- `Error: EEXIST: file already exists, mkdir 'path/to/context_data'`
- `could not access status of transaction` errors during operations
- Engine process exits with code 1 during startup
- System fails to initialize properly

## 2. The Solution: Proactive Directory Cleanup
Implement a "clean slate" approach by proactively removing and recreating the database directory on each startup to ensure a pristine state.

> [!NOTE]
> This approach is particularly valuable in development and production environments where dataset swapping is required and database corruption must be prevented.

### 2.1 The Protocol
1.  **Pre-Initialization Cleanup**: Before attempting database initialization:
    - Close any existing database connection gracefully
    - Remove the entire database directory if it exists
    - Verify directory removal completed successfully
2.  **Fresh Initialization**: Allow PGlite to create a completely fresh database instance
3.  **Schema Recreation**: Rebuild all required tables and indexes on the clean database
4.  **Data Re-Ingestion**: The `Watchdog` service will re-process files from the source directories

### 2.2 Implementation Requirements
```typescript
// src/core/db.ts
async init(): Promise<void> {
  const dbPath = process.env.PGLITE_DB_PATH || pathManager.getDatabasePath();
  
  // Pre-cleanup phase
  try {
    console.log(`[DB] Preparing database directory: ${dbPath}`);
    
    // Close any existing connection
    if (this.dbInstance) {
      await this.dbInstance.close();
      this.dbInstance = null;
    }
    
    // Remove existing database directory
    if (fs.existsSync(dbPath)) {
      console.log(`[DB] Removing existing database directory: ${dbPath}`);
      fs.rmSync(dbPath, { recursive: true, force: true });
    }
    
    console.log(`[DB] Database directory prepared: ${dbPath}`);
  } catch (cleanupError) {
    console.error(`[DB] Error during database directory preparation:`, cleanupError);
    throw cleanupError;
  }
  
  // Initialize fresh database
  try {
    this.dbInstance = await new PGlite(dbPath);
    console.log(`[DB] PGlite initialized successfully: ${dbPath}`);
  } catch (e) {
    console.error(`[DB] Failed to initialize PGlite: ${e.message}`);
    throw e;
  }
}
```

## 3. Benefits
- **Eliminates Startup Conflicts**: Prevents EEXIST errors during directory creation
- **Ensures Clean State**: Each startup begins with a pristine database
- **Facilitates Dataset Swapping**: Enables easy transition between different data sets
- **Reduces Corruption Risk**: Fresh database eliminates potential transaction state issues
- **Production Ready**: Supports the "text is king" philosophy with reliable data ingestion

## 4. Trade-offs
- **Performance Impact**: Initial startup takes longer due to complete database recreation
- **Data Persistence**: Any in-memory or temporary data is lost on each restart
- **Resource Usage**: May temporarily increase disk I/O during cleanup and initialization

## 5. Best Practices
- **Source of Truth**: Always maintain text files as the primary data source (filesystem)
- **Watchdog Coordination**: Ensure ingestion services start only after database is ready
- **Error Handling**: Implement proper error handling during cleanup operations
- **Logging**: Maintain detailed logs of cleanup and initialization operations for diagnostics

## 6. Migration Notes
This standard supersedes aspects of Standard 083 (Phoenix Pattern) for PGlite-based systems, focusing on proactive cleanup rather than reactive corruption recovery.

## 7. Authority
This standard applies to all database initialization operations in the Anchor/ECE_Core system and must be followed for any database-related startup procedures.