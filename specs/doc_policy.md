# Documentation Policy (Root Coda) - LLM Developer Directory

**Status:** Active | **Authority:** Human-Locked | **Domain:** LLM-First Development

## Core Philosophy for LLM Developers
1. **Code is King:** Code is the only source of truth. Documentation is a map, not the territory.
2. **Synchronous Testing:** EVERY feature or data change MUST include a matching update to the Test Suite.
3. **Visuals over Text:** Prefer Mermaid diagrams to paragraphs.
4. **Brevity:** Text sections must be <500 characters.
5. **Pain into Patterns:** Every major bug must become a Standard.
6. **LLM-First Documentation:** Documentation must be structured for LLM consumption and automated processing.
7. **Change Capture:** All significant system improvements and fixes must be documented in new Standard files.
8. **Modular Architecture:** Each component must be documented in isolation for LLM comprehension.
9. **API-First Design:** All interfaces must be clearly defined with examples.
10. **Self-Documenting Code:** Complex logic must include inline documentation explaining intent.

## LLM RESTRICTIONS & RULES
> [!IMPORTANT]
> **Strict Modification Rules for AI Agents:**
> 1.  **NO NEW FILES**: Do not create new `NNN-title.md` files.
> 2.  **UPDATE LIVING STANDARDS**: Only update the 4 Living Domain Standards (`Search`, `Data`, `Architecture`, `Database`).
> 3.  **USE CHANGELOG**: Log every architectural decision in `anchor-engine/CHANGELOG.md`.
> 4.  **DIAGRAMMATIC SPEC**: Keep `specs/spec.md` as a high-level visual map. Do not clutter it with code.

## LLM RESTRICTIONS & RULES
> [!IMPORTANT]
> **Strict Modification Rules for AI Agents:**
> 1.  **NO NEW FILES**: Do not create new `NNN-title.md` files.
> 2.  **UPDATE LIVING STANDARDS**: Only update the 4 Living Domain Standards (`Search`, `Data`, `Architecture`, `Database`).
> 3.  **USE CHANGELOG**: Log every architectural decision in `anchor-engine/CHANGELOG.md`.
> 4.  **DIAGRAMMATIC SPEC**: Keep `specs/spec.md` as a high-level visual map. Do not clutter it with code.

## LLM Developer Documentation Directory

### `QUICKSTART.md` (Root) — **USER WORKFLOW GUIDE**
*   **Role:** First-time user onboarding and daily workflow reference.
*   **Content:** Data ingestion methods, deduplication logic, backup/restore, search patterns.
*   **Audience:** End users.
*   **Authority:** Canonical guide for user interaction with ECE.

### `README.md` (Root) — **PROJECT OVERVIEW FOR HUMANS**
*   **Role:** Project overview, installation, and quick start for humans.
*   **Content:** What ECE is, how to install, link to QUICKSTART.md.

### `SPEC.md` (specs/) — **SYSTEM ARCHITECTURE MAP**
*   **Role:** High-level system architecture for LLM developers.
*   **Content:** Core components, data flow, interfaces.
*   **Audience:** LLM developers, system architects.
*   **Authority:** Single source of architectural truth.

### `STANDARDS/` (specs/standards/) — **IMPLEMENTATION RULES**
*   **Role:** Detailed implementation standards for LLM developers.
*   **Content:** Technical specifications, protocols, interfaces.
*   **Audience:** LLM developers implementing features.
*   **Authority:** Binding rules for code implementation.

### `TYPES/` (src/types/) — **DATA STRUCTURE DEFINITIONS**
*   **Role:** All system data structures for LLM comprehension.
*   **Content:** Interfaces, type definitions, schemas.
*   **Audience:** LLM developers working with data structures.
*   **Authority:** Source of truth for data contracts.

## Data Ingestion Standards

### Unified Ingestion Flow
```
┌─────────────────────────────────────────────────────────────────┐
│  INPUT METHODS (All paths lead to CozoDB)                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Drop files → context/           (Watcher auto-ingests)       │
│  2. Corpus YAML → context/          (read_all.js output)         │
│  3. API POST → /v1/ingest           (Programmatic)               │
│  4. Backup restore → backups/       (Session resume)             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  DEDUPLICATION LAYER                                             │
├─────────────────────────────────────────────────────────────────┤
│  • Hash match → Skip (exact duplicate)                           │
│  • >80% Jaccard → Skip (semantic duplicate)                      │
│  • 50-80% Jaccard → New version (temporal folding)               │
│  • <50% Jaccard → New document                                   │
│  • >500KB → Reject (Standard 053: FTS poisoning)                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  CozoDB GRAPH → Mirror → context/mirrored_brain/                │
└─────────────────────────────────────────────────────────────────┘
```

### Corpus File Format (read_all.js output)
```yaml
project_structure: "C:/path/to/project"
files:
  - path: "src/index.js"
    content: "// file content..."
  - path: "README.md"
    content: "# Project..."
metadata:
  total_files: N
  timestamp: "ISO-8601"
```

### Ingestion Rules
1. **Max Content Size:** 500KB per file (Standard 053: CozoDB Pain Points)
2. **Auto-Bucketing:** Top-level folder name = bucket; root files → `pending`
3. **Corpus Detection:** Files with `project_structure:` + `files:` array are extracted
4. **Temporal Folding:** Search shows latest version, history timestamps collapsed

## System Architecture for LLM Developers

### 1. Core Architecture (`specs/spec.md`)
*   **Role:** System blueprint for LLM developers.
*   **Format:** Visual architecture diagrams and component relationships.
*   **Content:** Kernel, Memory, Logic, Bridge components with interface definitions.
*   **LLM Focus:** Component boundaries and data flow for autonomous development.

### 2. Search Architecture (`specs/search_patterns.md`)
*   **Role:** Semantic search implementation guide for LLM developers.
*   **Format:** Algorithm specifications and interface definitions.
*   **Content:** Tag-Walker protocol, semantic intent translation, temporal folding implementation.
*   **LLM Focus:** Search algorithm internals for enhancement and debugging.

### 3. Living Domain Standards (`specs/standards/*.md`)
These 4 files are the **Binding Authority** for implementation:

#### A. `Search_Protocol.md`
*   **Scope:** Universal Semantic Search, 70/30 Budgeting, Context Inflation.
*   **Replaces:** Old Standards 086, 094, 104.

#### B. `Data_Pipeline.md`
*   **Scope:** Ingestion (Reliable/Ghost Data), Tag Infection, Code Analysis (AST).
*   **Replaces:** Old Standards 059, 068, 097.

#### C. `System_Architecture.md`
*   **Scope:** Server Startup, Worker Models, Standalone UI, Scaling.
*   **Replaces:** Old Standards 060, 088, 098, 103.

#### D. `Database_Schema.md`
*   **Scope:** PGlite Schema, Type Handling, Reset Protocols.
*   **Replaces:** Old Standards 053, 095, 099, 100.

## LLM Developer Reference Patterns

### Performance Optimization Patterns
*   **Native Acceleration**: Use C++ modules for performance-critical paths
*   **Zero-Copy Operations**: Use string_view to minimize memory allocation
*   **Batch Processing**: Group operations to reduce overhead
*   **Caching Strategies**: Implement strategic caching for repeated operations

### Error Handling Patterns
*   **Graceful Degradation**: Systems continue operating when components fail
*   **Fallback Chains**: Multiple implementation strategies for reliability
*   **Circuit Breakers**: Prevent cascading failures in distributed operations
* **Defensive Programming**: Validate inputs and handle edge cases

### Data Processing Patterns
*   **Atomic Operations**: Ensure data consistency during transformations
*   **Idempotency**: Operations produce same result when applied multiple times
*   **Eventual Consistency**: Systems converge to consistent state over time
*   **Data Hygiene**: Clean and validate data at ingestion points

## LLM Developer Quick References

### Common API Endpoints
*   `POST /v1/ingest` - Content ingestion with atomic processing
*   `POST /v1/memory/search` - Tag-Walker semantic search
*   `GET /health` - System health and component status
*   `GET /monitoring/metrics` - Performance metrics and system resources
*   `GET /v1/models` - Available LLM models and capabilities

### Key Data Structures
*   **Compound**: Document-level entity with full content and metadata
*   **Molecule**: Semantic segment with byte coordinates and relationship data
*   **Atom**: Atomic semantic unit with entity recognition and tagging
*   **Tag-Walker**: Graph traversal protocol for associative retrieval
*   **SimHash**: Fingerprinting algorithm for deduplication

### Native Module Functions
*   `fingerprint(content)` - Generate SimHash for content
*   `atomize(content, strategy)` - Split content into semantic molecules
*   `cleanse(content)` - Remove artifacts and normalize content
*   `distance(hash1, hash2)` - Compute similarity between fingerprints

## CozoDB Integration for LLM Developers

### Integration Architecture
The `cozo-node` package is a native addon that provides direct access to CozoDB's graph-relational-vector-fts engine. For LLM developers, understanding the function-based interface is critical:

- `open_db()` - Creates a database instance and returns a database ID
- `query_db()` - Executes queries against a database using its ID
- `close_db()` - Closes the database connection

### LLM Developer Considerations
1. **Function-Based Interface**: Unlike class-based databases, CozoDB uses individual functions with database IDs
2. **Native Module Handling**: Proper error handling and fallback mechanisms are essential
3. **Memory Management**: Database connections require explicit cleanup to prevent leaks
4. **Query Patterns**: CozoDB uses Datalog queries with FTS extensions for semantic search

### Recommended Patterns for LLM Developers
- Always implement try/catch blocks around database operations
- Use database ID management for connection pooling
- Implement proper cleanup in finally blocks
- Handle native module failures gracefully with fallbacks

### Testing Approach for LLM Developers
- Test database operations in isolation before integration
- Verify query patterns work with expected data structures
- Implement connection management tests
- Validate error handling paths

## NER Implementation for LLM Developers

### Local Discovery Architecture
The "Teacher" component implements CPU-first entity discovery to reduce LLM API costs. For LLM developers, the BERT-based NER approach provides:

- **Native Support**: Works with standard `token-classification` pipeline
- **Stability**: No custom inference logic required
- **Reliability**: Part of Hugging Face ecosystem with consistent availability

### LLM Developer Implementation Guidelines
*   **Primary Model**: `Xenova/bert-base-NER` (Quantized ONNX)
*   **Fallback Model**: `Xenova/bert-base-multilingual-cased-ner-hrl`
*   **Failsafe**: Main LLM via "Tag Infection" prompts

### Entity Classification for LLM Developers
- **Person Entities**: Names, titles, roles
- **Place Entities**: Locations, addresses, geographic features
- **Technical Terms**: Code, frameworks, technical concepts
- **Dates**: Temporal references, calendar dates
- **Concepts**: Abstract ideas, topics, themes

## Native Module Development for LLM Developers

### Core Principles for LLM Developers
1. **Graceful Degradation**: Services must continue operating when native modules fail
2. **Platform Compatibility**: Test across all target platforms before deployment
3. **Error Handling**: Implement comprehensive fallback mechanisms
4. **Performance Optimization**: Use native modules for performance-critical operations

### LLM Developer Implementation Patterns
- Use WASM/JavaScript fallbacks for critical functionality
- Implement comprehensive error handling around native calls
- Provide clear error messages for debugging
- Document platform-specific requirements
- Test both native and fallback code paths

### Performance Considerations for LLM Developers
- Native modules provide 2-3x performance improvement over JavaScript
- Use native modules for CPU-intensive operations (atomization, fingerprinting)
- Implement proper memory management to prevent leaks
- Consider zero-copy operations where possible (string_view in C++)

### Debugging Native Module Issues for LLM Developers
- Check platform-specific binary availability
- Verify native module loading paths
- Test fallback implementations when native modules unavailable
- Monitor memory usage patterns with native modules
- Validate function signatures and parameter types

## Monitoring & Diagnostics for LLM Developers

### System Health Architecture
The monitoring system provides comprehensive visibility into system operations:

- **Health Endpoints**: `/health`, `/health/database`, `/health/native`
- **Performance Metrics**: `/monitoring/metrics`, `/monitoring/performance`
- **Resource Monitoring**: `/monitoring/resources`, `/monitoring/system`
- **Request Tracing**: `/monitoring/traces`, `/monitoring/spans`

### LLM Developer Monitoring Tools
*   **Structured Logging**: Context-aware logging with performance metrics
*   **Performance Counters**: Operation timing and resource usage tracking
*   **Request Tracing**: Distributed tracing for request flow analysis
*   **Real-time Dashboard**: Visual monitoring of system metrics

### Key Monitoring Patterns for LLM Developers
- **Performance Baselines**: Establish normal operation metrics
- **Anomaly Detection**: Identify performance deviations
- **Resource Utilization**: Monitor memory, CPU, and disk usage
- **Error Tracking**: Capture and analyze system errors
- **Throughput Monitoring**: Track operations per second

### Diagnostic Implementation for LLM Developers
*   **Trace Context**: Propagate request context through all operations
*   **Performance Tags**: Add semantic tags to operations for analysis
*   **Health Checks**: Implement component-specific health verification
*   **Resource Tracking**: Monitor memory and CPU usage patterns
*   **Error Correlation**: Link errors to specific request flows