# Architecture Standards Index

**Last Updated:** February 20, 2026 | **Total Standards:** 77

---

## Active Standards (Current Implementation)

These standards define the current production architecture:

| # | Standard | Description | Status |
|---|----------|-------------|--------|
| **104** | [Universal Semantic Search](104-universal-semantic-search.md) | Unified search architecture (70/30 budget) | ✅ ACTIVE |
| **110** | Ephemeral Index | Disposable database pattern | ✅ ACTIVE |
| **109** | Batched Ingestion | Large file handling | ✅ ACTIVE |
| **103** | [Standalone UI Capability](103-standalone-ui-capability.md) | Internal lightweight UI serving | ✅ ACTIVE |
| **102** | [Centralized Configuration](102-centralized-configuration-management.md) | user_settings.json as single source | ✅ ACTIVE |
| **101** | [Byte Offset Protocol](101-byte-offset-protocol.md) | Efficient content retrieval | ✅ ACTIVE |
| **100** | [PGlite Type Handling](100-pglite-type-handling.md) | Database type validation | ✅ ACTIVE |
| **099** | [SQL Injection Prevention](099-sql-injection-prevention.md) | Parameterized queries | ✅ ACTIVE |
| **098** | [Scaling Architecture](098-scaling-architecture.md) | Horizontal scaling protocol | ✅ ACTIVE |
| **097** | [Enhanced Code Analysis](097-enhanced-code-analysis.md) | AST pointers for code | ✅ ACTIVE |
| **096** | [Timestamp Assignment](096-timestamp-assignment-protocol.md) | Temporal decay scoring | ✅ ACTIVE |
| **095** | [Database Reset](095-database-reset-on-startup.md) | Ephemeral index pattern | ✅ ACTIVE |
| **088** | [Server Startup Sequence](088-server-startup-sequence.md) | ECONNREFUSED fix | ✅ ACTIVE |
| **074** | [Native Module Acceleration](074-native-module-acceleration.md) | Iron Lung Protocol (C++) | ✅ ACTIVE |
| **065** | [Graph Associative Retrieval](065-graph-associative-retrieval.md) | Tag-Walker protocol | ✅ ACTIVE |
| **059** | [Reliable Ingestion](059-reliable-ingestion.md) | Ghost Data Protocol | ✅ ACTIVE |

---

## Deprecated Standards (Historical Reference)

These standards have been superseded but are kept for reference:

| # | Standard | Superseded By | Date |
|---|----------|---------------|------|
| **094** | [Smart Search Protocol](094-smart-search-protocol.md) | Standard 104 | Feb 2026 |
| **086** | Tag-Walker Calibration | Standard 104 | Feb 2026 |
| **084** | Semantic Shift Architecture | Current implementation | Jan 2026 |
| **073** | CozoDB Integration | PGlite migration | Nov 2025 |
| **063** | Cozo DB Syntax | PGlite migration | Nov 2025 |
| **064** | CozoDB Query Stability | PGlite migration | Nov 2025 |
| **067** | CozoDB Query Sanitization | PGlite migration | Nov 2025 |
| **053** | CozoDB Pain Points | PGlite migration | Nov 2025 |

---

## Archived Standards

Older standards organized by development phase:

### 001-050: Early Standards (July-September 2025)

**Location:** `archive/001-050-early-standards/`

Foundation standards from the CozoDB era:
- 001-009: Model loading configuration
- 012-030: Core architecture patterns
- 032-050: Service module patterns

### 051-080: Foundation Standards (October-November 2025)

**Location:** `archive/051-080-foundation-standards/`

PGlite migration and stabilization:
- 051-060: Service architecture
- 061-070: Data pipeline standards
- 071-080: UI and integration standards

### 081-095: Architecture Evolution (December 2025 - January 2026)

**Location:** `archive/081-095-architecture-standards/`

Browser Paradigm implementation:
- 081-085: Semantic architecture
- 086-090: Search optimization
- 091-095: Performance standards

---

## Core Architecture Documents

These documents provide overarching architecture guidance:

| Document | Description |
|----------|-------------|
| [System_Architecture.md](System_Architecture.md) | High-level system overview |
| [Database_Schema.md](Database_Schema.md) | PGlite schema reference |
| [Data_Pipeline.md](Data_Pipeline.md) | Ingestion pipeline specification |
| [Search_Protocol.md](Search_Protocol.md) | Search algorithm reference |

---

## Standards by Domain

### CORE Domain (Philosophy & Invariants)
- 001-030: Local-first invariants, privacy, configuration

### ARCH Domain (System Architecture)
- 051-080: Node.js monolith, PGlite, workers, UI

### DATA Domain (Data & Memory)
- 017-070: Ingestion, schemas, mirror protocol, Tag-Walker

### OPS Domain (Operations & Safety)
- 035-062: Logging, async handling, inference stability

### BRIDGE Domain (APIs & Interfaces)
- 058-103: Universal RAG API, UI architecture, extensions

---

## How to Use This Index

1. **Implementation:** Start with Active Standards (top section)
2. **Historical Context:** Check Deprecated Standards for why changes were made
3. **Deep Dives:** Browse Archived Standards by development phase
4. **Cross-Reference:** Use domain organization for related standards

---

## Standard Numbering

Standards are numbered sequentially. Gaps indicate deprecated or merged standards.

**Ranges:**
- 001-050: Foundation (July-September 2025)
- 051-080: Stabilization (October-November 2025)
- 081-100: Acceleration (December 2025-January 2026)
- 101-115: Production (February 2026-present)

---

## Contributing

When proposing new standards:

1. Check if existing standard covers the topic
2. Create new standard with next available number
3. Update this index
4. Link to related standards
5. Document deprecation if superseding existing standard

---

**Full Archive:** See `archive/` subdirectories for historical standards  
**Project Specs:** See `../spec.md`, `../tasks.md`, `../plan.md`  
**Whitepaper:** See `../../docs/whitepaper.md`
