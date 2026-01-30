# ECE_Core - Technical Specification

## Mission

Build a **personal external memory system** as an assistive cognitive tool using:
- **Hybrid Architecture**: Node.js/C++ with native modules for performance-critical operations.
- **CozoDB (RocksDB)**: Unified graph-relational-vector-fts engine (Replacing Neo4j/Redis).
- **Tag-Walker Protocol**: Graph-based associative retrieval (Replacing legacy Vector Search).
- **Mirror 2.0**: Tangible Knowledge Graph filesystem projections.
- **Local-first LLM integration**: `node-llama-cpp` for GGUF support.
- **Browser Paradigm**: Universal compatibility through selective loading and cross-platform design.
- **Stateless Contextual Chat Protocol (Standard 084)**: Context-first, stateless interaction model that grounds each response in relevant ECE data without session memory.

## Core Architecture

### 1. The Core (Node.js/C++ Hybrid Monolith)
The engine runs as a single, efficient Node.js process with high-performance C++ native modules for critical path operations:

1.  **Ingestion (The Refiner)**:
    * **Atomizer**: Splits text/code into logical units (accelerated with C++ native module).
    * **Key Assassin**: Surgically removes JSON artifacts from code (Data Hygiene) (accelerated with C++ native module).
    * **Fingerprint (SimHash)**: Generates locality-sensitive hashes for fuzzy deduplication (C++ native module).
    * **Enricher**: Assigns `source_id`, `sequence`, and `provenance`.
    * **Zero-Vector**: Stubs embedding slots to maintain schema compatibility without VRAM cost.

**Performance Benefits**:
    * **2.3x faster** code processing compared to pure JavaScript
    * **Zero-copy string processing** using `std::string_view` to reduce memory pressure
    * **Sub-millisecond processing** for typical operations
    * **Graceful fallback** to JavaScript implementations when native modules unavailable

2.  **Retrieval (Tag-Walker)**:
    * **Phase 1 (Anchors)**: Uses optimized FTS (Full Text Search) to find direct keyword matches (70% context budget).
    * **Phase 2 (The Walk)**: Pivots via shared tags/buckets to find "Associative Neighbors" that share context but lack keywords (30% context budget).

3.  **Persistence (CozoDB)**:
    * Backed by **RocksDB** for high-performance local storage.
    * Manages a Datalog graph of `*memory`, `*source`, and `*engrams`.

### 2. The Browser Paradigm Implementation
The system implements the "Browser Paradigm" for AI memory systems:

* **Universal Compatibility**: Runs on any device from smartphones to servers
* **Selective Loading**: Only loads relevant "atoms" for current query instead of entire dataset
* **Cross-Platform**: Consistent performance across different operating systems
* **Local-First**: All data remains on user's device for privacy and sovereignty

## Enhanced Architecture Components

### 3. Path Management System
The `PathManager` provides centralized path resolution across all platform environments:

* **Purpose**: Ensures consistent path handling across all modules
* **Features**: Platform-specific binary path resolution, database path management, notebook directory handling
* **Location**: `src/utils/path-manager.ts`

### 4. Native Module Management System
The `NativeModuleManager` provides robust loading and fallback mechanisms for native modules:

* **Purpose**: Handles native module loading with graceful degradation
* **Features**: Automatic fallback to JavaScript implementations, status tracking, cross-platform compatibility
* **Location**: `src/utils/native-module-manager.ts`

### 5. Bright Node Protocol
The enhanced search system implements the "Bright Node Protocol" for graph-based reasoning:

* **Purpose**: Selective graph illumination for reasoning models
* **Features**: `getBrightNodes` for focused graph traversal, `getStructuredGraph` for reasoning model input
* **Location**: `src/services/search/search.ts`

### 6. Resource Management System
The `ResourceManager` provides memory optimization and monitoring:

* **Purpose**: Optimize memory usage and prevent resource exhaustion
* **Features**: Memory monitoring, garbage collection triggers, performance optimization
* **Location**: `src/utils/resource-manager.ts`

## The Application Layer
* **API**: RESTful interface at `http://localhost:3000/v1/`.
* **Frontend**: Focused Single-Column React + Vite dashboard.
    *   **R1 Reasoning**: Displays a multi-stage thinking process (Initial -> Deepened -> Assess) before the answer.
    *   **GlassPanel Layout**: Atomic cyberpunk aesthetic with high-fidelity glassmorphism.
* **Desktop Overlay**: Electron "Thin Client" for Always-on-Top assistance.

## Standards Compliance

### Core Standards Implemented:
- **Standard 074**: Native Module Acceleration (The "Iron Lung" Protocol)
- **Standard 075**: macOS Native Build Configuration (Sequoia SDK Fix)
- **Standard 076**: TypeScript Compilation and ES Module Compatibility
- **Standard 051**: Service Module Path Resolution
- **Standard 058**: UniversalRAG API
- **Standard 059**: Reliable Ingestion (The "Ghost Data" Protocol)
- **Standard 065**: Graph-Based Associative Retrieval (Semantic-Lite)
- [Standard 069: Intelligent Query Expansion Protocol](standards/069-intelligent-query-expansion.md)
- [Standard 082: Universal Topology (Text/Data Unification)](standards/082-universal-topology.md)
- [Standard 083: Resilient Database Protocol (Auto-Purge)](standards/083-resilient-database.md)
## Documentation Standards

1. **Code is King**: Code is the only source of truth. Documentation is a map, not the territory.
2. **Synchronous Testing**: EVERY feature or data change MUST include a matching update to the Test Suite.
3. **Visuals over Text**: Prefer Mermaid diagrams to paragraphs.
4. **Brevity**: Text sections must be <500 characters.
5. **Pain into Patterns**: Every major bug must become a Standard.

## Build System

The project uses a hybrid build system:
- **Frontend**: Vite with TypeScript compilation
- **Engine**: TypeScript compilation with `tsc`
- **Native Modules**: `node-gyp` for C++ compilation
- **Desktop Overlay**: TypeScript compilation with Electron packaging

## Testing Strategy

Comprehensive test coverage across multiple levels:
- **Unit Tests**: Individual function and class testing
- **Integration Tests**: Module interaction testing
- **System Tests**: End-to-end functionality verification
- **Performance Tests**: Benchmarking and optimization validation

## Performance Characteristics

- **Memory Usage**: Optimized for low-resource environments (MBs not GBs)
- **Query Latency**: Millisecond retrieval of millions of tokens
- **Cross-Platform**: Consistent performance across Windows, macOS, and Linux
- **Native Acceleration**: 2.3x performance improvement for critical operations

## Security & Privacy

- **Local-First**: All data remains on user's device
- **Encryption**: Optional encryption for sensitive data
- **Access Controls**: Granular permissions for different data types
- **Audit Trail**: Complete logging of all operations

## Future Evolution

The architecture is designed for continuous evolution:
- **Modular Design**: Components can be replaced or upgraded independently
- **Plugin Architecture**: Support for custom modules and extensions
- **API Stability**: Backward compatibility maintained across versions
- **Community Driven**: Open standards and extensible architecture