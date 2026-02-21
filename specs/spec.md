# Anchor Engine - System Specification

**Version:** 4.0.0 | **Status:** Production Ready | **Updated:** February 2026

## Quick Reference

| Aspect | Value |
|--------|-------|
| **Port** | 3160 (configurable) |
| **Database** | PGlite (PostgreSQL-compatible) |
| **Source of Truth** | `mirrored_brain/` filesystem |
| **Index** | Disposable, rebuildable on startup |
| **Search** | STAR Algorithm (70/30 Planets/Moons) |
| **Native Modules** | @rbalchii/* npm packages (C++ N-API) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  UI Layer (React/Vite or Electron)                     │
├─────────────────────────────────────────────────────────┤
│  HTTP API (Express) - Port 3160                        │
├─────────────────────────────────────────────────────────┤
│  Services: Ingestion | Search | Watchdog | Dreamer     │
├─────────────────────────────────────────────────────────┤
│  Native Modules: Atomizer | Fingerprint | KeyAssassin  │
├─────────────────────────────────────────────────────────┤
│  Database: PGlite (Atoms + Tags + FTS)                 │
└─────────────────────────────────────────────────────────┘
```

### Data Model: Compound → Molecule → Atom

- **Compound:** File/document reference
- **Molecule:** Semantic chunk with byte offsets
- **Atom:** Tag/concept (content lives in `mirrored_brain/`)

### STAR Search Algorithm

```
Gravity = (SharedTags) × e^(-λΔt) × (1 - SimHashDistance/64)

70% Planets: Direct FTS matches
30% Moons: Graph-discovered associations
```

---

## Project History (July 2025 - February 2026)

| Phase | Date | Milestone |
|-------|------|-----------|
| **Inception** | July 2025 | Project started, initial architecture |
| **Foundation** | Aug-Sep 2025 | CozoDB integration, core ingestion |
| **Stabilization** | Oct-Nov 2025 | PGlite migration, reliability fixes |
| **Acceleration** | Dec 2025 | Native C++ modules (2.3x speedup) |
| **Browser Paradigm** | Jan 2026 | Tag-Walker replaces vector search |
| **Production** | Feb 2026 | 100MB ingested, 280K molecules, ready |

---

## File Structure

```
anchor-engine-node/
├── README.md              # Quick start & overview
├── CHANGELOG.md           # Version history
├── docs/
│   └── whitepaper.md      # The Sovereign Context Protocol
├── specs/
│   ├── spec.md            # This file
│   ├── tasks.md           # Current sprint tasks
│   ├── plan.md            # Roadmap
│   └── standards/
│       ├── README.md      # Standards index
│       ├── 104-*.md       # ⭐ Active standards
│       └── archive/       # Historical standards
├── engine/                # Core engine source
├── packages/              # Monorepo packages
└── mirrored_brain/        # Source of truth (gitignored)
```

---

## Active Standards

| # | Name | Description |
|---|------|-------------|
| **104** | Universal Semantic Search | Unified search architecture |
| **110** | Ephemeral Index | Disposable database pattern |
| **109** | Batched Ingestion | Large file handling |
| **094** | Smart Search Protocol | Fuzzy fallback (deprecated but referenced) |
| **088** | Server Startup Sequence | ECONNREFUSED fix |
| **074** | Native Module Acceleration | Iron Lung Protocol |
| **065** | Graph Associative Retrieval | Tag-Walker protocol |
| **059** | Reliable Ingestion | Ghost Data Protocol |

See `specs/standards/README.md` for full index.

---

## API Endpoints

```bash
GET  /health                     # System status
POST /v1/ingest                  # Ingest content
POST /v1/memory/search           # Search memory
GET  /v1/buckets                 # List buckets
GET  /v1/tags                    # List tags
```

---

## Performance Benchmarks

| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| **90MB Ingestion** | ~178s | <200s | ✅ |
| **Memory Peak** | <1GB | <1GB | ✅ |
| **Search Latency (p95)** | ~150ms | <200ms | ✅ |
| **SimHash Speed** | ~2ms/atom | <5ms | ✅ |

---

## Documentation

- **[README.md](../README.md)** - Quick start, API examples, troubleshooting
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history with 6-month timeline
- **[docs/whitepaper.md](../docs/whitepaper.md)** | The Sovereign Context Protocol
- **[specs/tasks.md](tasks.md)** - Current sprint tasks
- **[specs/plan.md](plan.md)** - Project roadmap
- **[specs/standards/](standards/)** - Architecture standards

---

**Repository:** https://github.com/RSBalchII/anchor-engine-node  
**License:** AGPL-3.0  
**Production Status:** ✅ Ready (February 20, 2026)
