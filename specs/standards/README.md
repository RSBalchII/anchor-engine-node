# The Sovereign Engineering Code (SEC)

This is the authoritative reference manual for the External Context Engine (ECE) project. Standards are organized by domain to facilitate navigation and understanding.

## Domain 00: CORE (Philosophy & Invariants)
Philosophy, Privacy, and "Local-First" invariants that govern the fundamental principles of the system.

### Standards:
- [012-context-utility-manifest.md](00-CORE/012-context-utility-manifest.md) - Context utility manifest and philosophical foundations
- [027-no-resurrection-mode.md](00-CORE/027-no-resurrection-mode.md) - Manual control via NO_RESURRECTION_MODE flag
- [028-default-no-resurrection-mode.md](00-CORE/028-default-no-resurrection-mode.md) - Default behavior for Ghost Engine resurrection

## Domain 10: ARCH (System Architecture)
Node.js Monolith, CozoDB, Termux, Hardware limits, and system architecture decisions.

### Standards:
- [003-webgpu-initialization-stability.md](10-ARCH/003-webgpu-initialization-stability.md) - WebGPU initialization stability
- [004-wasm-memory-management.md](10-ARCH/004-wasm-memory-management.md) - WASM memory management
- [014-async-best-practices.md](10-ARCH/014-async-best-practices.md) - Async/await patterns for system integration
- [014-gpu-resource-availability.md](10-ARCH/014-gpu-resource-availability.md) - GPU resource availability
- [023-anchor-lite-simplification.md](10-ARCH/023-anchor-lite-simplification.md) - Anchor Lite architectural simplification
- [031-ghost-engine-stability-fix.md](10-ARCH/031-ghost-engine-stability-fix.md) - CozoDB schema FTS failure handling
- [032-ghost-engine-initialization-flow.md](10-ARCH/032-ghost-engine-initialization-flow.md) - Database initialization race condition prevention
- [034-nodejs-monolith-migration.md](10-ARCH/034-nodejs-monolith-migration.md) - Migration to Node.js monolith architecture
- [048-epochal-historian-recursive-decomposition.md](10-ARCH/048-epochal-historian-recursive-decomposition.md) - Epochal Historian & Recursive Decomposition (Epochs -> Episodes -> Propositions)
- [051-service-module-path-resolution.md](10-ARCH/051-service-module-path-resolution.md) - Service Module Path Resolution for subdirectory services
- [057-enterprise-library-architecture.md](10-ARCH/057-enterprise-library-architecture.md) - Enterprise Library Architecture (Logical Notebooks/Cartridges)

## Domain 20: DATA (Data, Memory, Filesystem)
Source of Truth, File Ingestion, Schemas, YAML Snapshots, and all data-related concerns.

### Standards:
- [017-file-ingestion-debounce-hash-checking.md](20-DATA/017-file-ingestion-debounce-hash-checking.md) - File ingestion with debouncing and hash checking
- [019-code-file-ingestion-comprehensive-context.md](20-DATA/019-code-file-ingestion-comprehensive-context.md) - Comprehensive context for code file ingestion
- [021-chat-session-persistence-context-continuity.md](20-DATA/021-chat-session-persistence-context-continuity.md) - Chat session persistence and context continuity
- [022-text-file-source-of-truth-cross-machine-sync.md](20-DATA/022-text-file-source-of-truth-cross-machine-sync.md) - Text files as source of truth with cross-machine synchronization
- [024-context-ingestion-pipeline-fix.md](20-DATA/024-context-ingestion-pipeline-fix.md) - Context ingestion pipeline fixes
- [029-consolidated-data-aggregation.md](20-DATA/029-consolidated-data-aggregation.md) - Consolidated data aggregation approach
- [030-multi-format-output.md](20-DATA/030-multi-format-output.md) - JSON, YAML, and text output support
- [033-cozodb-syntax-compliance.md](20-DATA/033-cozodb-syntax-compliance.md) - CozoDB syntax compliance requirements
- [037-database-hydration-snapshot-portability.md](20-DATA/037-database-hydration-snapshot-portability.md) - Database hydration and snapshot portability workflow
- [052-schema-evolution-epochal-classification.md](20-DATA/052-schema-evolution-epochal-classification.md) - Schema Evolution & Epochal Classification for hierarchical memory organization
- [053-cozodb-pain-points-reference.md](20-DATA/053-cozodb-pain-points-reference.md) - **🔥 CRITICAL**: CozoDB pain points, gotchas, and lessons learned

## Domain 30: OPS (Protocols, Safety, Debugging)
Agent Safety (Protocol 001), Logging, Async handling, and operational procedures.

### Standards:
- [001-windows-console-encoding.md](30-OPS/001-windows-console-encoding.md) - Windows console encoding handling
- [011-comprehensive-testing-verification.md](30-OPS/011-comprehensive-testing-verification.md) - Comprehensive testing and verification
- [013-universal-log-collection.md](30-OPS/013-universal-log-collection.md) - Universal log collection system
- [016-process-management-auto-resurrection.md](30-OPS/016-process-management-auto-resurrection.md) - Process management and auto-resurrection
- [020-browser-profile-management-cleanup.md](30-OPS/020-browser-profile-management-cleanup.md) - Browser profile management and cleanup
- [024-detached-logging-standard.md](30-OPS/024-detached-logging-standard.md) - Detached execution with logging
- [025-script-logging-protocol.md](30-OPS/025-script-logging-protocol.md) - Script logging protocol (Protocol 001)
- [035-never-attached-mode.md](30-OPS/035-never-attached-mode.md) - Never run services in attached mode (Detached Execution)
- [036-log-file-management-protocol.md](30-OPS/036-log-file-management-protocol.md) - Log file management and rotation
- [050-windows-background-process-behavior.md](30-OPS/050-windows-background-process-behavior.md) - Windows background process behavior and console window prevention

## Domain 40: BRIDGE (APIs, Extensions, UI)
Extensions, Ports, APIs, and all interface-related concerns.

### Standards:
- [010-bridge-redirect-implementation.md](40-BRIDGE/010-bridge-redirect-implementation.md) - Bridge redirect implementation
- [015-browser-control-center.md](40-BRIDGE/015-browser-control-center.md) - Unified browser control center
- [018-streaming-cli-client-responsive-ux.md](40-BRIDGE/018-streaming-cli-client-responsive-ux.md) - Responsive UX for streaming CLI clients
- [026-ghost-engine-connection-management.md](40-BRIDGE/026-ghost-engine-connection-management.md) - Ghost Engine connection management
