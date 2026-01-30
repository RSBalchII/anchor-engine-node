# Standard 083: Resilient Database Protocol (The "Phoenix" Pattern)

**Status:** Implemented | **Topic:** Database Reliability & Corruption Recovery

## 1. The Problem: RocksDB Fragility
Embedded databases (like RocksDB via CozoDB) are prone to corruption during:
- Unexpected power loss
- Process termination (SIGKILL)
- File lock contention (`LOCK` file issues)
- Test suite race conditions

**Symptom:** The engine fails to start with `rocksdb::kInvalidArgument: .../CURRENT: does not exist`.

## 2. The Solution: Auto-Purge & Reincarnation
We adopt a "Phoenix" philosophy: If the internal state is corrupted, we burn it down and rise from the source of truth.

> [!NOTE]
> This is only possible because the **File System is the Source of Truth**. The Database is merely a cache/index.

### 2.1 The Protocol
1.  **Attempt Initialization**: Try to open the RocksDB backend.
2.  **Catch Corruption**: Explicitly listen for `Invalid argument`, `IO error`, or `lock file` messages.
3.  **The Purge**:
    -   **Verify Path**: Ensure we are only deleting the intended database directory (Safety check).
    -   `fs.rmSync(path, { recursive: true, force: true })`
4.  **The Rebirth**:
    -   Re-initialize the `CozoDb` instance.
    -   Re-run schema creation scripts (`:create memory`, etc.).
    -   **Result**: Empty but functional database.
5.  **Re-Ingestion**: The `Watchdog` service will naturally detect the "missing" files (via full scan or new events) and re-ingest them, restoring the state.

## 3. Implementation (Reference)

```typescript
// src/core/db.ts
try {
    this.dbInstance = new CozoDb("rocksdb", dbPath);
} catch (e: any) {
    if (isCorruption(e)) {
        console.warn("[DB] Corruption detected. Purging...");
        fs.rmSync(dbPath, { recursive: true, force: true });
        this.dbInstance = new CozoDb("rocksdb", dbPath); // Retry
    }
}
```

## 4. Best Practices
-   **Never manual delete**: Let the engine handle cleanup.
-   **Stateless by Design**: Never store "Golden Data" solely in RocksDB. Always persist to `.md` or `.json` files in the workspace.
