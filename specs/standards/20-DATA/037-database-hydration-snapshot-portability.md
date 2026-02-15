# Standard 037: Database Hydration & Snapshot Portability

**Status:** Active | **Domain:** DATA | **Number:** 037

## The Triangle of Pain

### 1. What Happened
Large context libraries (89MB+) were difficult to move between machines because the "Filesystem as Source of Truth" required re-ingesting thousands of files. This process was slow, resource-intensive, and prone to file watcher errors or race conditions during initial indexing.

### 2. The Cost
Hours of developer time lost to "ingestion loops," "missing context" errors after migration, and inconsistent database states across different environments. The system was "brittle" during the first 10 minutes of startup on a new machine.

### 3. The Rule
Use **YAML Snapshots** as the primary portable artifact for the database state.
- **Eject**: Export the current database state to a single YAML file for backup or migration.
- **Auto-Hydrate**: On startup, the engine automatically checks if the database is empty. If it is, it picks the **latest** snapshot from the `backups/` folder and performs a bulk, idempotent restore.
- **Manual Control**: Users can manually move old snapshots to a separate folder to prevent them from being picked, or delete the `engine/context.db` folder to force a fresh hydration from the latest snapshot.
- **Persistence**: Once hydrated, the data lives in the persistent `engine/context.db` (RocksDB). The original source files are no longer required for the engine to function, enabling a "Docker-style" build-and-ship workflow.

---
*Verified by Architecture Council. Created after 89MB Context Migration.*
