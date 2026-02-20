# Changelog

All notable changes to the Anchor Engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [4.0.0] - 2026-02-16 — Architecture Clarification

### Critical Architecture Documentation

**The PGlite database is NOT the source of truth.** This release clarifies that Anchor Engine uses a **disposable index architecture**:

- **Source of Truth**: `mirrored_brain/` directory (plain filesystem)
- **Index**: PGlite database (byte-offset pointers + tags, rebuildable)
- **Implication**: Database wipe on shutdown is intentional — data persists in `mirrored_brain/`

### STAR Algorithm Documentation

Comprehensive documentation added for the physics-based search algorithm:

**Unified Field Equation:**
```
Gravity(atom, anchor) = (SharedTags) × e^(-λ × ΔTime) × (1 - SimHashDistance/64)
```

**Search Phases:**
1. **Planets (70%)**: Direct keyword FTS matches
2. **Moons (30%)**: Graph-discovered associations via tag-walker
3. **Fusion Scoring**: Gravity-weighted ranking

**Performance:**
- Search latency (p95): ~150ms
- Ingestion throughput: >100 atoms/sec
- SimHash dedup: ~2ms/atom

### Data Model Clarification

**Compound → Molecule → Atom** hierarchy clarified:
- **Compound**: File/document reference
- **Molecule**: Semantic chunk with byte-offset pointers (`start_byte`, `end_byte`)
- **Atom**: Tag/concept (NOT content) — content lives in `mirrored_brain/`

### Future Enhancements

Documented AST pointer support for code files:
- Enable semantic code search ("find all functions calling X")
- Track imports/exports as graph edges
- Type-aware retrieval

### Documentation Changes

- **README.md**: Added "Architecture: Disposable Index" section
- **README.md**: Added "STAR Search Algorithm" deep dive
- **README.md**: Updated data model with byte-offset pointer explanation
- **README.md**: Added SQL implementation example
- Version bumped to 4.0.0 to reflect architectural maturity

---

## [Unreleased]

## [Standard 104] - 2026-02-10
### Added
- **Universal Semantic Search Protocol**: Unified search architecture replacing "Smart Search" and "Tag Walker".
- **70/30 Distributed Budgeting**: Strict token budget split (70% Direct / 30% Associative) to balance depth and breadth.
- **Adaptive Radius**: Dynamic context window sizing based on budget (Deep for direct matches, Broad for related matches).
- **Smart Content Weighting**: `code_weight` parameter to penalize logs/code in narrative searches.

### Deprecated
- **Standard 094 (Smart Search)**: The "Strict Anchor Phase" (AND logic) proved too brittle for natural language queries.
- **Standard 086 (Tag Walker)**: Replaced by the unified Semantic Search route.

## [Standard 103] - 2026-02-05
### Added
- **Standalone UI**: Internal lightweight UI serving capability for the engine.

## [Standard 098] - 2026-01-28
### Added
- **Horizontal Scaling Architecture**: Distributed processing protocol.
