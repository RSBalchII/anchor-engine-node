# Standard 080: Application Health & Lifecycle

## Status
- **Last Updated:** 2026-01-25
- **Status:** Active
- **Scope:** Core Engine, Desktop Overlay, API

## Overview
This standard defines the lifecycle states of the Sovereign Context Engine (ECE) and the API contracts for monitoring system health. It specifically addresses how the Desktop Overlay and external consumers should interpret the system's operational status.

## 1. Health States
The `/health` endpoint serves as the heartbeat of the system. It returns standard HTTP status codes to indicate readiness.

| State | Status Code | Description | Action Required |
| :--- | :--- | :--- | :--- |
| **Healthy** | `200 OK` | System is fully operational. All components (DB, FS, Native) are healthy. | **Normal Operation** |
| **Degraded** | `207 Multi-Status` | System is operational but has minor issues (e.g., High Memory, Missing Optional Models, Stateless DB Mode). | **Identify & Monitor** |
| **Unhealthy** | `503 Service Unavailable` | System cannot perform core functions (e.g., Missing Notebook Dir, Native Module Crash). | **Block Boot / User Intervention** |

### 1.1 Degraded Handling
Clients (Desktop Overlay) **MUST** accept `207` as a successful boot condition.
- **High Memory:** If usage > 80%, system enters Degraded state but remains functional. Background GC will attempt to clear it.
- **Stateless Mode:** If CozoDB cannot persist to disk (Windows limitation), system enters Degraded mode but functionality (Ingest/Retrieval) works in-memory.

## 2. Startup Requirements

### 2.1 Memory Management
The Engine relies on **Manual Garbage Collection** to handle high-throughput HTML ingestion strings.
- **Flag Required:** The Node.js process MUST be started with `--expose-gc`.
- **Resource Manager:** The `ResourceManager` service monitors heap usage and triggers `global.gc()` when usage exceeds 85%.

### 2.2 Critical Path Verification
Before reporting Healthy/Degraded, the system checks:
1. `PathManager.getNotebookDir()` is accessible.
2. `PathManager.getContextDir()` contains tag configurations.

If these fail, the system is **Unhealthy (503)** and prevents the UI from loading (preventing user confusion over empty data).

## 3. Graceful Shutdown
To prevent database corruption (RocksDB locks), the system must handle `SIGINT`/`SIGTERM`.
- **Database Close:** The `db.close()` method must be called synchronously or awaited before process exit.
- **File System:** Ensure no partial write streams are active.

## 4. Boot Sequence Troubleshooting

### 4.1 White Screen / Infinite Loading
- **Cause:** Electron app receiving `503` or unexpectedly failing on `207`.
- **Diagnostic:** Check `engine` console logs for `[Health] System Unhealthy!`.
- **Resolution:** Fix the specific component listed in the health response (usually FileSystem pathing).

### 4.2 High Memory Crash
- **Cause:** `start.bat` or `main.ts` missing `--expose-gc`.
- **Diagnostic:** `[ResourceManager] Garbage collection not available` warning in logs.
- **Resolution:** Ensure launch scripts include the flag.
