# Domain Standard: System Architecture

**Status:** LIVING | **Domain:** Core System & Operations
**Maintained By:** Anchor Engine Team
**Last Updated:** 2026-02-10

## 1. Overview
The Anchor Engine is a modular, local-first Knowledge OS. It operates as a Node.js server with native C++ accelerants, managing a PGlite database and communicating via HTTP/WebSocket.

## 2. Server Startup Sequence (Standard 088)
To prevent `ECONNREFUSED` errors in the Electron wrapper:
1.  **Server First**: `app.listen()` binds immediately.
2.  **DB Backgrounding**: `db.init()` runs in the background.
3.  **State Tracking**: `db.isInitialized` flag gates database-dependent routes.
4.  **Health Check**: `/health` returns "Degraded" (not "Error") while DB initializes.

## 3. Worker System (Standard 060)
Offloads heavy compute to prevent Event Loop blocking.
*   **ChatWorker**: Handles LLM inference (`node-llama-cpp`).
*   **EmbeddingWorker**: Handles vector generation.
*   **Isolation**: Workers act as independent processes; failure in one does not crash the main server.

## 4. Standalone UI Capability (Standard 103)
The Engine is usable without the full Electron shell.
*   **Dual Mode**:
    *   **Integrated**: Serves `packages/anchor-ui/dist` if present.
    *   **Standalone**: Serves `engine/public` (lightweight internal UI) if external UI is missing.
*   **Auto-Detection**: Startup logic checks filesystem capability.

## 5. Horizontal Scaling (Standard 098)
*Planned for Future Phases*
*   **Sharding**: Distribute `atoms` table across PGlite instances by content hash.
*   **Gateway**: Central API references a map of Shard Replicas.
