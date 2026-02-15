# Standard 051: Service Module Path Resolution

## Status
- **Last Updated:** 2026-01-25
- **Status:** Active
- **Scope:** Core Engine, Desktop Overlay

## Overview
This standard defines the centralized path resolution strategy for the Sovereign Context Engine (ECE). To support cross-platform compatibility and inconsistent project structures, all file system access MUST utilize the `PathManager` singleton rather than relative paths or `__dirname` logic scattered throughout the codebase.

## 1. Directory Structure
The ECE architecture distinguishes between **Project-Local** resources (immutable configuration/logic) and **Workspace-Shared** resources (user data/models).

### 1.1 Project-Local Resources
These directories reside *within* the `ECE_Core` project numbering.
- **Context Config**: `.../ECE_Core/context` (Tags, System Prompts)
- **Specifications**: `.../ECE_Core/specs` (Documentation, Standards)
- **Engine Logic**: `.../ECE_Core/engine` (Source Code)

### 1.2 Workspace-Shared Resources
These directories reside *adjacent* to the `ECE_Core` project, allowing them to be shared across different versions or tools in the same workspace.
- **User Data**: `.../Projects/notebook` (Markdown, Inbox, Memories)
- **Models**: `.../Projects/models` (GGUF, Embeddings)
- **Archives**: `.../Projects/archive`

### 1.3 Path Resolution Logic
The `PathManager` must intelligently resolve these paths relative to the Engine's execution context.

| Resource | Scope | Resolution Strategy (Relative to Engine Base) |
| :--- | :--- | :--- |
| **Engine Base** | Base | `__dirname` / `process.resourcesPath` |
| **Database** | Project | `basePath/context.db` (RocksDB) |
| **Context** | Project | `basePath/../context` |
| **Specs** | Project | `basePath/../specs` |
| **Notebook** | Workspace | `basePath/../../notebook` |
| **Models** | Workspace | `basePath/../../models` |

> **Note:** The ".." traversal depends on where the compiled entry point `dist/index.js` resides.

## 2. Implementation Guidelines

### 2.1 The PathManager Singleton
All services must import the singleton instance of `PathManager`.
```typescript
import { pathManager } from '../utils/path-manager.js';

// GOOD
const dbPath = pathManager.getDatabasePath();

// BAD
const dbPath = path.join(__dirname, '../../context.db');
```

### 2.2 Native Module Resolution
Native modules (`.node` files) often have platform-specific names (`cozo_node_win32.node`, `ece_native.node`).
- `PathManager.getNativePath(binaryName)` must resolve to the correct binary based on `process.platform`.
- Resolution should check both the **Engine Directory** (production/distribution) and **Build Releases** (dev).

## 3. ESM Compatibility
In ES Modules, `__dirname` is not defined. The `PathManager` handles this abstraction:
```typescript
// Internal PathManager Implementation
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
this.basePath = path.resolve(__dirname, '../..');
```
All consumers should rely on `PathManager` properties instead of implementing this `fileURLToPath` boilerplate.

## 4. Boot-Time Verification
During system startup (Health Check), the `PathManager` acts as the source of truth for critical paths. The Health Check service must verify:
1. `notebook` directory exists and is writable.
2. `context` directory exists and contains `internal_tags.json`.
3. `models` directory exists (optional, but recommended).

Failure to access `notebook` or `context` should result in an **Unhealthy (503)** or **Degraded (207)** state.
