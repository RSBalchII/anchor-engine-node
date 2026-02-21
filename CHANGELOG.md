# Changelog

All notable changes to the Anchor Engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [4.0.0] - 2026-02-20 — Production Ready

### ✅ Whitepaper Implementation Complete

All specifications from the Sovereign Context Protocol whitepaper have been implemented and verified:

- ✅ STAR Algorithm (Tag-Walker with gravity scoring)
- ✅ SimHash Deduplication (O(1) duplicate detection)
- ✅ Disposable Index Architecture (Standard 110)
- ✅ Cross-Platform Native Modules (@rbalchii/* npm packages)
- ✅ Resource Efficiency (<1GB for 90MB datasets)
- ✅ SQL-Native Implementation (PGlite + CTEs)

### Performance Benchmarks (Verified)

| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| **90MB Ingestion** | ~178s | <200s | ✅ |
| **Memory Peak** | <1GB | <1GB | ✅ |
| **Search Latency (p95)** | ~150ms | <200ms | ✅ |
| **Event Loop Yielding** | <100ms | <100ms | ✅ |
| **Native Acceleration** | 20x | 20x | ✅ |

### Production Deployment (Feb 2026)

- **436 files** ingested (~100MB total)
- **~280,000 molecules** processed
- **~1,500 atoms** indexed
- **331 files** rehydrated successfully
- **Zero data loss** with ephemeral index architecture

---

## [4.0.0] - 2026-02-16 — Architecture Clarification

### Critical Architecture Documentation

**The PGlite database is NOT the source of truth.** This release clarifies the **disposable index architecture**:

- **Source of Truth:** `mirrored_brain/` directory (plain filesystem)
- **Index:** PGlite database (byte-offset pointers + tags, rebuildable)
- **Implication:** Database wipe on shutdown is intentional—data persists in `mirrored_brain/`

### STAR Algorithm Documentation

Comprehensive documentation added for the physics-based search algorithm:

**Unified Field Equation:**
```
Gravity(atom, anchor) = (SharedTags) × e^(-λ × ΔTime) × (1 - SimHashDistance/64)
```

**Search Phases:**
1. **Planets (70%):** Direct keyword FTS matches
2. **Moons (30%):** Graph-discovered associations via tag-walker
3. **Fusion Scoring:** Gravity-weighted ranking

### Data Model Clarification

**Compound → Molecule → Atom** hierarchy:
- **Compound:** File/document reference
- **Molecule:** Semantic chunk with byte-offset pointers
- **Atom:** Tag/concept (NOT content)—content lives in `mirrored_brain/`

---

## [Standard 104] - 2026-02-10 — Universal Semantic Search

### Added

- **Universal Semantic Search Protocol:** Unified search architecture
- **70/30 Distributed Budgeting:** Strict token budget split (70% Direct / 30% Associative)
- **Adaptive Radius:** Dynamic context window sizing based on budget
- **Smart Content Weighting:** `code_weight` parameter for search tuning

### Deprecated

- **Standard 094 (Smart Search):** "Strict Anchor Phase" (AND logic) too brittle for natural language
- **Standard 086 (Tag Walker):** Replaced by unified Semantic Search route

---

## [Standard 103] - 2026-02-05 — Standalone UI

### Added

- **Standalone UI:** Internal lightweight UI serving capability
- **UI Detection Logic:** Automatic selection between external/internal UI
- **Catch-all Routes:** SPA routing support

---

## [Standard 102] - 2026-02-01 — Configuration Management

### Added

- **Centralized Configuration:** `user_settings.json` as single source of truth
- **Path Management:** Cross-platform path resolution
- **Runtime Configuration:** Dynamic reload capabilities

---

## [Standard 101] - 2026-01-28 — Byte Offset Protocol

### Added

- **Byte Offset Pointers:** Efficient content retrieval without loading full files
- **Radial Context Inflation:** Load ±50KB around matched atoms
- **Memory Efficiency:** 60% reduction in memory usage

---

## [Standard 100] - 2026-01-25 — PGlite Type Handling

### Fixed

- **Type Validation:** Proper input validation for PGlite
- **String Type Errors:** Fixed "Invalid input for string type" errors
- **Parameter Binding:** Safe parameterized queries

---

## [Standard 099] - 2026-01-22 — SQL Injection Prevention

### Added

- **Parameterized Queries:** All database queries use parameter binding
- **Input Sanitization:** Query input validation and sanitization
- **Security Audit:** Comprehensive security review

---

## [Standard 098] - 2026-01-28 — Scaling Architecture

### Added

- **Horizontal Scaling:** Distributed processing protocol
- **Worker System:** High-performance worker architecture
- **Load Balancing:** Request distribution across workers

---

## [Standard 097] - 2026-01-20 — Enhanced Code Analysis

### Added

- **AST Pointers:** Semantic code search support
- **Code Type Detection:** Function, class, module identification
- **Dependency Tracking:** Import/export graph edges

---

## [Standard 096] - 2026-01-18 — Timestamp Assignment

### Added

- **Consistent Timestamps:** Unified timestamp assignment protocol
- **Temporal Decay:** Time-based relevance scoring
- **Chronology Sorting:** "Earliest" and "latest" query modifiers

---

## [Standard 095] - 2026-01-15 — Database Reset

### Added

- **Startup Reset:** Automatic database wipe on startup (ephemeral index)
- **Rehydration:** Rebuild index from `mirrored_brain/` on startup
- **Zero Data Loss:** Guaranteed data persistence in filesystem

---

## [Standard 094] - 2026-01-12 — Smart Search Protocol

### Added

- **Intelligent Parsing:** Stopword removal and intent detection
- **Fuzzy Fallback:** Automatic retry with broader logic
- **Dynamic Sorting:** Keyword-based chronological sorting
- **Tag-Based Filtering:** Hashtag filtering support

### Deprecated

- Replaced by Standard 104 (Universal Semantic Search)

---

## [Standard 088] - 2026-01-10 — Server Startup Sequence

### Fixed

- **ECONNREFUSED:** Server starts before database initialization
- **Health Endpoints:** Handle uninitialized state gracefully
- **Extended Timeouts:** Proper initialization sequences

---

## [Standard 087] - 2026-01-08 — Relationship Narratives

### Added

- **Entity Co-occurrence:** Detect relationships between entities
- **Semantic Categories:** #Relationship, #Narrative, #Technical tags
- **Relationship Historian:** Track entity interactions over time

---

## [Standard 086] - 2026-01-06 — Tag-Walker Calibration

### Added

- **Search Calibration:** Improved natural language query handling
- **Multi-Context Split:** Decompose complex queries
- **Iterative Search:** Progressive query simplification

### Deprecated

- Replaced by Standard 104 (Universal Semantic Search)

---

## [Standard 085] - 2026-01-04 — Context Inflation

### Added

- **Context Inflation:** Combine adjacent molecules into coherent windows
- **Molecule Merging:** Contextually meaningful segments
- **Coherence Improvement:** Better retrieval quality

---

## [Standard 084] - 2026-01-02 — Semantic Shift

### Added

- **Semantic Categories:** High-level categorization system
- **Relationship-Focused Search:** Entity relationship prioritization
- **Intent Mapping:** Natural language to semantic categories

---

## [Standard 074] - 2025-12-20 — Native Module Acceleration

### Added

- **C++ N-API Modules:** Performance-critical operations
- **Graceful Degradation:** JavaScript fallbacks when native unavailable
- **Cross-Platform Builds:** Windows, macOS, Linux support
- **Performance Monitoring:** Native module health tracking

### Performance

- **2.3x faster** code processing
- **Sub-millisecond** operations for typical tasks
- **Zero-copy** string processing with `std::string_view`

---

## [Standard 065] - 2025-12-10 — Graph Associative Retrieval

### Added

- **Tag-Walker Protocol:** Graph-based search replacing vector search
- **Bipartite Graph:** Atoms ↔ Tags structure
- **70/30 Budget:** Planets (direct) and Moons (associative) split
- **Unified Field Equation:** Physics-based gravity scoring

---

## [Standard 059] - 2025-11-25 — Reliable Ingestion

### Added

- **Ghost Data Protocol:** Reliable ingestion pipeline
- **Batched Processing:** Atomic batch commits
- **Error Recovery:** Graceful error handling
- **Progress Tracking:** Ingestion status monitoring

---

## [Unreleased]

### Planned

- Enhanced code analysis with AST pointers
- Relationship narrative discovery improvements
- Mobile application support
- Plugin marketplace
- Diffusion-based reasoning models

---

## Legacy Versions

### [3.x] - 2025 (CozoDB Era)

- CozoDB database integration (deprecated)
- Initial Tag-Walker implementation
- Basic ingestion pipeline

### [2.x] - 2024 (Prototype)

- Prototype implementation
- Core atomization concepts
- Early search algorithms

### [1.x] - 2023 (Concept)

- Initial concept and design
- Whitepaper development
- Architecture planning

---

**Production Status:** ✅ Ready (February 20, 2026)  
**Repository:** https://github.com/RSBalchII/anchor-engine-node
