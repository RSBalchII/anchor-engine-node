# The Sovereign Engineering Code (SEC)

This is the authoritative reference manual for the External Context Engine (ECE) project. Standards are organized by domain to facilitate navigation and understanding.

## Domain 00: CORE (Philosophy & Invariants)

Philosophy, Privacy, and "Local-First" invariants that govern the fundamental principles of the system.

### Standards:

## Domain 08: ARCHITECTURE (System Design & Cognitive Patterns)

Architectural standards governing system design and cognitive processing patterns.

### Standards:
- **084**: Semantic Shift Architecture (The "Relationship Historian") - Transforming from keyword index to semantic graph with relationship-focused search

- [012-context-utility-manifest.md](012-context-utility-manifest.md) - Context utility manifest and philosophical foundations
- [027-no-resurrection-mode.md](027-no-resurrection-mode.md) - Manual control via NO_RESURRECTION_MODE flag
- [028-default-no-resurrection-mode.md](028-default-no-resurrection-mode.md) - Default behavior for Ghost Engine resurrection
- [074-native-module-acceleration.md](00-CORE/074-native-module-acceleration.md) - Iron Lung Protocol for C++ native modules
- [075-macos-native-build-configuration.md](00-CORE/075-macos-native-build-configuration.md) - macOS Sequoia SDK fix for native builds

## Domain 10: ARCH (System Architecture)

Node.js Monolith, PGlite, Termux, Hardware limits, and system architecture decisions.

### Standards:

- [003-webgpu-initialization-stability.md](003-webgpu-initialization-stability.md) - WebGPU initialization stability
- [004-wasm-memory-management.md](004-wasm-memory-management.md) - WASM memory management
- [014-async-best-practices.md](014-async-await-best-practices.md) - Async/await patterns for system integration
- [023-anchor-lite-simplification.md](023-anchor-lite-simplification.md) - Anchor Lite architectural simplification
- [031-ghost-engine-stability-fix.md](031-ghost-engine-stability-fix.md) - PGlite schema FTS failure handling
- [032-ghost-engine-initialization-flow.md](032-ghost-engine-initialization-flow.md) - Database initialization race condition prevention
- [034-nodejs-monolith-migration.md](034-nodejs-monolith-migration.md) - Migration to Node.js monolith architecture
- [048-epochal-historian-recursive-decomposition.md](048-epochal-historian-recursive-decomposition.md) - Epochal Historian & Recursive Decomposition
- [051-service-module-path-resolution.md](10-ARCH/051-service-module-path-resolution.md) - **[ESM]** Service Module Path Resolution & Native Loading
- [057-enterprise-library-architecture.md](057-enterprise-library-architecture.md) - Enterprise Library Architecture (Logical Notebooks/Cartridges)
- [060-worker-system.md](060-worker-system.md) - High-performance worker architecture
- [085-pglite-implementation.md](085-pglite-implementation.md) - Migration from CozoDB to PGlite (PostgreSQL-compatible)

## Domain 20: DATA (Data, Memory, Filesystem)

Source of Truth, File Ingestion, Schemas, YAML Snapshots, and all data-related concerns.

### Standards:

- [017-file-ingestion-debounce-hash-checking.md](017-file-ingestion-debounce-hash-checking.md) - File ingestion with debouncing and hash checking
- [019-code-file-ingestion-comprehensive-context.md](019-code-file-ingestion-comprehensive-context.md) - Comprehensive context for code file ingestion
- [021-chat-session-persistence-context-continuity.md](021-chat-session-persistence-context-continuity.md) - Chat session persistence and context continuity
- [022-text-file-source-of-truth-cross-machine-sync.md](022-text-file-source-of-truth-cross-machine-sync.md) - Text files as source of truth
- [024-context-ingestion-pipeline-fix.md](024-context-ingestion-pipeline-fix.md) - Context ingestion pipeline fixes
- [029-consolidated-data-aggregation.md](029-consolidated-data-aggregation.md) - Consolidated data aggregation approach
- [030-multi-format-output.md](030-multi-format-output.md) - JSON, YAML, and text output support
- [033-pglite-syntax-compliance.md](033-pglite-syntax-compliance.md) - PGlite syntax compliance requirements
- [052-schema-evolution-epochal-classification.md](052-schema-evolution-epochal-classification.md) - Schema Evolution & Epochal Classification
- [053-pglite-pain-points-reference.md](053-pglite-pain-points-reference.md) - **🔥 CRITICAL**: PGlite pain points and gotchas
- [059-reliable-ingestion.md](059-reliable-ingestion.md) - Ghost Data Protocol for reliable ingestion
- [061-context-logic.md](061-context-logic.md) - Advanced context window logic
- [063-pglite-syntax-reference.md](063-pglite-syntax-reference.md) - PGlite syntax reference
- [064-pglite-query-stability.md](064-pglite-query-stability.md) - Query stability and error handling
- [065-graph-associative-retrieval.md](065-graph-associative-retrieval.md) - Tag-Walker: Bridge & Walk phases
- [066-human-readable-mirror.md](066-human-readable-mirror.md) - Filesystem projection of graph data
- [067-pglite-query-sanitization.md](067-pglite-query-sanitization.md) - Preventing injection and syntax errors
- [068-tag-infection-protocol.md](068-tag-infection-protocol.md) - Weak Supervision & Tag Infection
- [069-intelligent-query-expansion.md](069-intelligent-query-expansion.md) - Semantic intent translation
- [070-local-discovery.md](070-local-discovery.md) - Local Discovery & NER Standardization

## Domain 30: OPS (Protocols, Safety, Debugging)

Agent Safety (Protocol 001), Logging, Async handling, and operational procedures.

### Standards:

- [001-windows-console-encoding.md](001-windows-console-encoding.md) - Windows console encoding handling
- [011-comprehensive-testing-verification.md](011-comprehensive-testing-verification.md) - Testing and verification
- [013-universal-log-collection.md](013-universal-log-collection.md) - Universal log collection system
- [016-process-management-auto-resurrection.md](016-process-management-auto-resurrection.md) - Process management
- [020-browser-profile-management-cleanup.md](020-browser-profile-management-cleanup.md) - Browser profile management
- [024-detached-logging-standard.md](024-detached-logging-standard.md) - Detached execution with logging
- [025-script-logging-protocol.md](025-script-logging-protocol.md) - Script logging protocol (Protocol 001)
- [035-never-attached-mode.md](035-never-attached-mode.md) - Never run services in attached mode
- [036-log-file-management-protocol.md](036-log-file-management-protocol.md) - Log file management and rotation
- [050-windows-background-process-behavior.md](050-windows-background-process-behavior.md) - Windows background process behavior
- [062-inference-stability.md](062-inference-stability.md) - CUDA error handling and model stability

## Domain 40: BRIDGE (APIs, Extensions, UI)

Extensions, Ports, APIs, and all interface-related concerns.

### Standards:

- [010-bridge-redirect-implementation.md](010-bridge-redirect-implementation.md) - Bridge redirect implementation
- [015-browser-control-center.md](015-browser-control-center.md) - Unified browser control center
- [018-streaming-cli-client-responsive-ux.md](018-streaming-cli-client-responsive-ux.md) - Responsive UX for streaming CLI clients
- [026-ghost-engine-connection-management.md](026-ghost-engine-connection-management.md) - Ghost Engine connection management
- [058-universal-rag-api.md](058-universal-rag-api.md) - Standard Unified RAG Endpoint
- [074-atomic-frontend-architecture.md](074-atomic-frontend-architecture.md) - Atomic Frontend Architecture & Glassmorphism System
- [103-standalone-ui-capability.md](103-standalone-ui-capability.md) - Internal Lightweight UI for Independent Operation

## Deprecated Standards (Historical Reference)

The following standards have been deprecated as of the migration to PGlite (PostgreSQL-compatible) database:

- [053-cozodb-pain-points-reference.md](053-cozodb-pain-points-reference.md) - **DEPRECATED**: Former CozoDB pain points and gotchas
- [063-cozo-db-syntax.md](063-cozo-db-syntax.md) - **DEPRECATED**: Former CozoDB syntax reference
- [064-cozodb-query-stability.md](064-cozodb-query-stability.md) - **DEPRECATED**: Former CozoDB query stability (now PGlite)
- [067-cozodb-query-sanitization.md](067-cozodb-query-sanitization.md) - **DEPRECATED**: Former CozoDB query sanitization
- [073-cozodb-integration.md](073-cozodb-integration.md) - **DEPRECATED**: Former CozoDB integration standard