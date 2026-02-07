# System Architecture Specification (Root Spec) - LLM Developer Blueprint

**Status:** Active | **Authority:** Human-Locked | **Domain:** LLM-First Development

## Core Architecture Overview

### Component Hierarchy
```
┌─────────────────────────────────────────────────────────────────┐
│  ELECTRON WRAPPER LAYER                                        │
├─────────────────────────────────────────────────────────────────┤
│  • UI Presentation Layer                                       │
│  • Health Check Client                                         │
│  • Process Management                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  ENGINE SERVER LAYER                                           │
├─────────────────────────────────────────────────────────────────┤
│  • HTTP API Gateway                                            │
│  • Route Management                                            │
│  • Request Processing                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  NATIVE MODULE LAYER (Published as npm packages)               │
├─────────────────────────────────────────────────────────────────┤
│  • @rbalchii/native-atomizer (Sentence Splitting)              │
│  • @rbalchii/native-keyassassin (Content Sanitization)         │
│  • @rbalchii/native-fingerprint (SimHash Generation)           │
│  • @rbalchii/tag-walker (Tag Discovery)                        │
│  • @rbalchii/dse (Deterministic Semantic Expansion)            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  DATABASE LAYER                                                │
├─────────────────────────────────────────────────────────────────┤
│  • PGlite (PostgreSQL-Compatible)                              │
│  • Schema Management                                           │
│  • Query Processing                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Startup Sequence (Standard 088 Compliant)
```
┌─────────────────────────────────────────────────────────────────┐
│  OLD SEQUENCE (FAILED)                                         │
├─────────────────────────────────────────────────────────────────┤
│  1. await db.init() ← BLOCKING                                │
│  2. app.listen() ← DELAYED                                    │
│  3. Electron wrapper timeout ← ECONNREFUSED                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  NEW SEQUENCE (SUCCESSFUL)                                     │
├─────────────────────────────────────────────────────────────────┤
│  1. app.listen() ← IMMEDIATE                                  │
│  2. await db.init() ← BACKGROUND                              │
│  3. Electron wrapper connects ← SUCCESS                       │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture Principles

### 1. The Browser Analogy
| Component | Browser Equivalent | Anchor Implementation |
|-----------|-------------------|-------------------|
| Rendering Engine | Chromium/V8 | C++ N-API Modules |
| Shell/Interface | Browser UI | Node.js Application |
| Content Delivery | HTTP/CDN | Tag-Walker Protocol |
| Storage | IndexedDB/LocalStorage | PGlite (PostgreSQL-compatible) |

### 2. The "Write Once, Run Everywhere" Foundation
Anchor achieves cross-platform compatibility through:
- **Node.js Orchestration**: Handles OS-specific operations and networking
- **C++ N-API Modules**: Performance-critical operations compiled to native code
- **Standard ABI**: N-API provides a stable interface between JavaScript and C++
- **Universal Binaries**: Automated build system creates platform-specific native modules

### 3. The "Iron Lung" Protocol
The hybrid Node.js/C++ architecture implements the "Iron Lung" protocol:
```
[User Input] -> [Node.js Layer] -> [N-API Boundary] -> [C++ Performance Layer] -> [Results]
```

This allows rapid development in JavaScript while maintaining performance-critical operations in C++.

## System Components

### Core Services
- **Ingestion Service**: Content processing pipeline with native acceleration
- **Search Service**: Tag-Walker protocol for graph-based associative retrieval
- **Watchdog Service**: File system monitoring with debounced processing
- **Dreamer Service**: Background processing for self-organization
- **Backup Service**: Snapshot management for data persistence

### Database Schema (PostgreSQL-compatible)
- **Atoms Table**: Individual knowledge units with content, metadata, and relationships
- **Tags Table**: Semantic tags and relationships between atoms
- **Edges Table**: Connections between related atoms
- **Sources Table**: Document origins and ingestion metadata
- **Molecules/Compounds Tables**: Hierarchical content organization

### API Endpoints
- `GET /health` - System readiness check (handles uninitialized state)
- `POST /v1/ingest` - Content ingestion with semantic processing
- `POST /v1/memory/search` - Semantic search with token budgeting
- `POST /v1/memory/molecule-search` - Splits query into sentence-like chunks
- `GET /v1/buckets` - Get available data buckets
- `GET /v1/tags` - Get available tags
- `POST /v1/backup` - Create database backup
- `GET /v1/backups` - List available backups
- `POST /v1/backup/restore` - Restore from backup

## Performance Characteristics

### Native Module Benefits
- **2.3x Performance Improvement**: Over pure JavaScript implementations
- **Sub-millisecond Processing**: For typical operations
- **Zero-Copy String Processing**: Using `std::string_view` to reduce memory pressure
- **Batch Processing**: SIMD-optimized operations for distance calculations

### Critical Path Operations
1. **Atomization**: Splitting content into semantic molecules
2. **Sanitization**: Removing JSON artifacts and log spam ("Key Assassin")
3. **Fingerprinting**: Generating SimHash for deduplication
4. **Distance Calculation**: Computing similarity between fingerprints

## Search Architecture

### Tag-Walker Protocol
The core search mechanism replaces legacy vector search with graph-based associative retrieval:
1. **Initial FTS**: Full-text search with GIN index
2. **Pivot**: Identify key terms and semantic categories
3. **Walk**: Traverse graph relationships to find related content

### Smart Search Protocol (Standard 094)
- **Intelligent Parsing**: Remove stopwords and detect intent
- **Fuzzy Fallback**: Automatically retry with broader logic if strict search fails
- **Dynamic Sorting**: Use keywords like "earliest" or "oldest" to toggle chronological sorting
- **Tag-Based Filtering**: Use hashtags for precise filtering

## Data Model

### Atomic Architecture: Compound → Molecule → Atom
- **Compound**: The source document (e.g., `journal_entry.yaml`)
- **Molecule**: The text chunk with semantic meaning (e.g., paragraph/sentence)
- **Atom**: The atomic entity within molecules (e.g., "Alice", "Bob", "Albuquerque")

### Semantic Categories
Instead of unlimited granular tags, the system uses constrained semantic categories:
- `#Relationship`: People interacting, personal connections
- `#Narrative`: Stories, timelines, memories, sequences
- `#Technical`: Code, architecture, system documentation
- `#Industry`: External market data (Oil, CO2, etc.)
- `#Location`: Geographic or spatial references
- `#Emotional`: High sentiment variance content
- `#Temporal`: Time-based sequences and chronology
- `#Causal`: Cause-effect relationships

## Agent Harness Integration

### Harness Agnosticism Goal
Anchor is designed to be **agent harness agnostic**, meaning it can work with multiple agent frameworks and systems. While **OpenCLAW** is the primary harness we intend to use, the system is architected to support:

- OpenCLAW (primary target)
- Other custom agent frameworks
- Third-party agent systems
- Direct API integrations

### Data Atomization Service
Anchor's core function is as a **data atomization service** that:
- Packages diverse data types into semantically meaningful units
- Enables semantic utilization of multiple data types
- Provides CLI access for querying and parsing data
- Outputs data in standardized formats (tables, CSV, JSON)
- Serves as a foundational layer for various agent systems

The system can be queried through the Anchor CLI to parse data into structured formats that can be consumed by any agent harness.

## Error Handling & Resilience

### Graceful Degradation
- **Native Module Fallback**: JavaScript implementations when native modules unavailable
- **Database Connectivity**: Health checks handle uninitialized state gracefully
- **Connection Stability**: Fixed ECONNREFUSED errors with proper startup sequence
- **Resource Management**: Memory optimization and automatic garbage collection

### Startup Error Prevention (Standard 088)
- Server binds to port before database initialization
- Health endpoints handle uninitialized state gracefully
- Extended timeouts for initialization sequences
- Fallback mechanisms for database connectivity

## Security & Privacy

### Local-First Architecture
- All data remains under user control, no cloud dependencies
- Encryption for sensitive data storage
- Secure configuration management
- Process isolation between components

### Access Control
- Localhost-only binding for sensitive endpoints
- Input validation for all API routes
- Secure transmission protocols
- Access logging for audit trails

## Monitoring & Observables

### Health Checks
- System status: `GET /health`
- Component status: `GET /health/{component}`
- Performance metrics: `GET /monitoring/metrics`
- Resource utilization: Continuous monitoring with configurable intervals

### Diagnostic Capabilities
- Structured logging with context
- Request tracing across components
- Performance counters for operations
- Error correlation and analysis

## Configuration Management

### Runtime Configuration
- Environment variable overrides
- JSON configuration files
- Dynamic reload capabilities
- Validation for configuration changes

### Feature Flags
- Toggle services without restart
- Enable/disable experimental features
- A/B testing support
- Rollback capabilities

## Deployment Architecture

### Technology Stack
- **Backend**: Node.js with Express.js
- **Database**: PGlite (PostgreSQL-compatible)
- **Frontend**: TypeScript, React (Vite build system)
- **Desktop**: Electron wrapper
- **AI Integration**: Local LLM support with remote fallback

### Cross-Platform Support
- Windows 10+ / macOS 10.15+ / Linux Ubuntu 20.04+
- Consistent performance across platforms
- Platform-specific binary compilation
- Universal installation scripts

## Standards Implemented
- **Standard 053**: PGlite Pain Points & OS Compatibility
- **Standard 059**: Reliable Ingestion Pipeline & Database Type Safety Protocol
- **Standard 088**: Server Startup Sequence (ECONNREFUSED fix)
- **Standard 094**: Smart Search Protocol (Fuzzy Fallback & GIN Optimization)
- **Standard 095**: Database Reset on Startup Protocol (Tabula Rasa Pattern)
- **Standard 096**: Timestamp Assignment Protocol (Temporal Context Propagation)
- **Standard 097**: Enhanced Code Analysis (AST Integration & Code Intelligence)
- **Standard 098**: Horizontal Scaling Architecture (Distributed Processing Protocol)

## Change Management

### Versioning Strategy
- Semantic versioning for releases
- Backward compatibility preservation
- Migration path documentation
- Deprecation notices

### Testing Integration
- Automated testing for all changes
- Integration testing for workflows
- Performance regression testing
- Security vulnerability scanning