# The Sovereign Engineering Code (SEC)

This is the authoritative reference manual for the External Context Engine (ECE) project. Standards are organized by domain to facilitate navigation and understanding.

## Domain 00: CORE (Philosophy & Invariants)
Philosophy, Privacy, and "Local-First" invariants that govern the fundamental principles of the system.

### Standards:
- [012-context-utility-manifest.md](00-CORE/012-context-utility-manifest.md) - Context utility manifest and philosophical foundations
- [028-default-no-resurrection-mode.md](00-CORE/028-default-no-resurrection-mode.md) - Default behavior for Ghost Engine resurrection

## Domain 10: ARCH (System Architecture)
Node.js Monolith, CozoDB, Termux, Hardware limits, and system architecture decisions.

### Standards:
- [003-webgpu-initialization-stability.md](10-ARCH/003-webgpu-initialization-stability.md) - WebGPU initialization stability
- [004-wasm-memory-management.md](10-ARCH/004-wasm-memory-management.md) - WASM memory management
- [014-gpu-resource-availability.md](10-ARCH/014-gpu-resource-availability.md) - GPU resource availability
- [034-nodejs-monolith-migration.md](10-ARCH/034-nodejs-monolith-migration.md) - Migration to Node.js monolith architecture

## Domain 20: DATA (Data, Memory, Filesystem)
Source of Truth, File Ingestion, Schemas, YAML Snapshots, and all data-related concerns.

### Standards:
- [017-file-ingestion-debounce-hash-checking.md](20-DATA/017-file-ingestion-debounce-hash-checking.md) - File ingestion with debouncing and hash checking
- [022-text-file-source-of-truth-cross-machine-sync.md](20-DATA/022-text-file-source-of-truth-cross-machine-sync.md) - Text files as source of truth with cross-machine synchronization
- [029-consolidated-data-aggregation.md](20-DATA/029-consolidated-data-aggregation.md) - Consolidated data aggregation approach
- [033-cozodb-syntax-compliance.md](20-DATA/033-cozodb-syntax-compliance.md) - CozoDB syntax compliance requirements

## Domain 30: OPS (Protocols, Safety, Debugging)
Agent Safety (Protocol 001), Logging, Async handling, and operational procedures.

### Standards:
- [001-windows-console-encoding.md](30-OPS/001-windows-console-encoding.md) - Windows console encoding handling
- [016-process-management-auto-resurrection.md](30-OPS/016-process-management-auto-resurrection.md) - Process management and auto-resurrection
- [025-script-logging-protocol.md](30-OPS/025-script-logging-protocol.md) - Script logging protocol (Protocol 001)
- [035-never-attached-mode.md](30-OPS/035-never-attached-mode.md) - Never run services in attached mode

## Domain 40: BRIDGE (APIs, Extensions, UI)
Extensions, Ports, APIs, and all interface-related concerns.

### Standards:
- [010-bridge-redirect-implementation.md](40-BRIDGE/010-bridge-redirect-implementation.md) - Bridge redirect implementation
- [026-ghost-engine-connection-management.md](40-BRIDGE/026-ghost-engine-connection-management.md) - Ghost Engine connection management