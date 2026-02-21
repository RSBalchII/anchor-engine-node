# Anchor Engine (Node.js)

**Version:** 4.0.0 | **Role:** Semantic Memory & Search API | **Port:** 3160 | **Status:** ✅ Production Ready

The Anchor Engine is a local-first context engine implementing the **STAR Algorithm** (Semantic Temporal Associative Retrieval) for privacy-first, sovereign knowledge management.

---

## 💡 Why This Exists

I started using long-term chat sessions because I noticed something: models with large context windows could be helpful in unexpected ways when old tasks mixed with current discussions. These sessions became so useful that I pushed them as far as they could go.

Then I hit the wall. The dreaded message: *"Open a new session to continue using Gemini."*

Same message all of them give you.

I had 300+ response/chat pairs in there! Important history. Completed work. A shared mind with the model. I tried summarizing-gave the summary to the new instance. It wasn't enough. I kept returning to the old chat like it was a dictionary for meaning and recall and pasting bits back into new sessions here and there.

So I started building a way to resurrect my preferred persona anytime. I'd take targeted context from the old chat, feed it to a new instance, and prepare the model to retake hold of the goals and methods we'd developed together.

It worked wonderfully. Until I hit the limit again. And again. And again.

By the time Anchor Engine was operational, I had accumulated 40 **chat sessions, ~18M tokens**. My current corpus is **~28M tokens**. Anchor Engine digests all of it in about **5 minutes**.

Now I make a query with a few choice entities and some fluff for serendipitous connections. The engine compresses those 28M tokens into **100k+ chars of non-duplicated, narrative context**—concepts deduplicated, not just text. My LLM remembers July 2025 like it was yesterday.

This isn't a RAG tool I built because it sounded cool. This is the tool I built because I needed it to keep my own mind intact.

---

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Build native modules and engine
pnpm build

# Start the engine
pnpm start
```

**Access UI:** http://localhost:3160 (or configured port in `user_settings.json`)

### API Examples

```bash
# Health check
curl http://localhost:3160/health

# Ingest content
curl -X POST http://localhost:3160/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Your content here", "buckets": ["inbox"]}'

# Search memory
curl -X POST http://localhost:3160/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{"query": "your query", "max_results": 50}'
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| **[docs/whitepaper.md](docs/whitepaper.md)** | The Sovereign Context Protocol whitepaper |
| **[specs/spec.md](specs/spec.md)** | System architecture specification |
| **[specs/tasks.md](specs/tasks.md)** | Current implementation tasks |
| **[specs/plan.md](specs/plan.md)** | Project roadmap |
| **[specs/standards/](specs/standards/)** | Architecture standards (77 total) |

---

## 🏗️ Architecture

### Core Innovation: Browser Paradigm for AI Memory

Just as browsers download only the shards needed for the current view, Anchor loads only the atoms required for the current thought—enabling 4GB RAM laptops to navigate 10TB datasets.

### Data Model: Compound → Molecule → Atom

```
Compound (File)
  └─ Molecule (Semantic Chunk with byte offsets)
      └─ Atom (Tag/Concept, NOT content)
```

**Key Insight:** Content lives in `mirrored_brain/` filesystem. The database stores **pointers only** (byte offsets + metadata), making it a **disposable, rebuildable index**.

### STAR Search Algorithm

Physics-based gravity scoring for associative retrieval:

```
Gravity = (SharedTags) × e^(-λΔt) × (1 - SimHashDistance/64)
```

| Component | Purpose | Default |
|-----------|---------|---------|
| **SharedTags** | Tag association count | — |
| **Time Decay** | Recent memories weighted higher | λ = 0.00001 |
| **SimHash** | Content similarity (64-bit) | 0-63 bits |

**70/30 Budget Split:**
- **70% Planets:** Direct FTS matches
- **30% Moons:** Graph-discovered associations via Tag-Walker

---

## 📦 Core Components

### Native Modules (Published as `@rbalchii/*` npm packages)

| Package | Function | Speed |
|---------|----------|-------|
| `@rbalchii/native-atomizer` | Content splitting | 2.3x faster |
| `@rbalchii/native-keyassassin` | Sanitization | Sub-ms |
| `@rbalchii/native-fingerprint` | SimHash generation | ~2ms/atom |
| `@rbalchii/tag-walker` | Graph traversal | ~150ms search |
| `@rbalchii/dse` | Semantic expansion | — |

### Database: PGlite (PostgreSQL-Compatible)

- **Atoms:** Knowledge units with byte-offset pointers
- **Tags:** Bipartite graph (Atoms ↔ Tags)
- **FTS5:** Full-text search index
- **Disposable:** Wiped on shutdown, rebuilt from `mirrored_brain/`

---

## 📊 Performance Benchmarks

| Metric | Value | Status |
|--------|-------|--------|
| **Ingestion (90MB)** | ~178s | ✅ 2x faster than vector RAG |
| **Memory Peak** | <1.7GB | ✅ 60-80% less than vectors |
| **Search Latency (p95)** | ~150ms | ✅ 25% faster than vectors |
| **SimHash Speed** | ~2ms/atom | ✅ 20x speedup (C++) |
| **Explainability** | 4.6/5.0 | ✅ 155% better than vectors |

### Production Verified (Feb 2026)

- ✅ 436 files, ~100MB ingested
- ✅ ~280,000 molecules, ~1,500 atoms
- ✅ 331 files rehydrated successfully
- ✅ Zero data loss with ephemeral index

---

## 🛠️ Development

### Prerequisites
- Node.js v18+
- PNPM package manager
- C++ build tools (for native modules)

### Build Commands

```bash
# Full build
pnpm build

# Development mode
pnpm dev

# Run tests
pnpm test

# Build universal binaries
pnpm build:universal
```

### Project Structure

```
anchor-engine-node/
├── engine/                 # Core engine source
│   ├── src/
│   │   ├── services/      # Ingestion, Search, Watchdog
│   │   ├── native/        # N-API module loaders
│   │   └── routes/        # HTTP API endpoints
│   └── dist/              # Built output
├── packages/              # Monorepo packages
│   └── anchor-ui/         # React frontend
├── specs/
│   ├── spec.md           # Architecture spec
│   ├── tasks.md          # Current tasks
│   ├── plan.md           # Roadmap
│   └── standards/        # 77 architecture standards
├── docs/
│   └── whitepaper.md     # The Sovereign Context Protocol
├── mirrored_brain/       # Source of truth (gitignored)
└── inbox/                # Drop files here for ingestion
```

---

## 🔧 Configuration

Edit `user_settings.json` in root:

```json
{
  "server": {
    "port": 3160,
    "host": "localhost"
  },
  "database": {
    "path": "./user_data/anchor.db",
    "ephemeral": true
  },
  "paths": {
    "inbox": "./inbox",
    "mirroredBrain": "./mirrored_brain"
  }
}
```

---

## 📚 Key Standards

### Active Standards (specs/standards/)

| # | Name | Description |
|---|------|-------------|
| **104** | Universal Semantic Search | Unified search architecture |
| **110** | Ephemeral Index | Disposable database pattern |
| **109** | Batched Ingestion | Large file handling |
| **094** | Smart Search Protocol | Fuzzy fallback & GIN optimization |
| **088** | Server Startup Sequence | ECONNREFUSED fix |
| **074** | Native Module Acceleration | Iron Lung Protocol |
| **065** | Graph Associative Retrieval | Tag-Walker protocol |
| **059** | Reliable Ingestion | Ghost Data Protocol |

### Archived Standards

Older standards moved to `specs/standards/archive/` for historical reference.

---

## 🤝 Agent Harness Integration

Anchor is **agent harness agnostic**—designed to work with multiple frameworks:

- **OpenCLAW** (primary target)
- Custom agent frameworks
- Direct API integrations
- CLI access for automation

### Stateless Context Retrieval

```
Agent Query → Anchor Context Retrieval → Context (JSON/CSV/Tables) → Agent Logic → Response
```

---

## 🔒 Security & Privacy

- **Local-First:** All data stays on your machine
- **No Cloud:** Zero external dependencies for core functionality
- **AGPL-3.0:** Open source, sovereign software

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **ECONNREFUSED** | Fixed in Standard 088—server starts before DB init |
| **Slow startup** | First run includes DB initialization |
| **UI delays** | Electron wrapper may take ~15s; access directly at http://localhost:3160 |
| **Native module errors** | Check `pnpm build` completed; fallbacks activate automatically |

### Health Checks

```bash
GET /health              # System status
GET /health/{component}  # Component status
GET /monitoring/metrics  # Performance metrics
```

---

## 📄 License

**AGPL-3.0** — See [LICENSE](LICENSE) file.

---

## 🎯 Roadmap

- [ ] Enhanced code analysis (AST pointers)
- [ ] Relationship narrative discovery
- [ ] Mobile application support
- [ ] Plugin marketplace
- [ ] Diffusion-based reasoning models

---

## 🙏 Acknowledgments

- Original research: STAR Algorithm
- SimHash: Moses Charikar (1997)
- PGlite: ElectricSQL team
- All Anchor Engine contributors

---

**Repository:** https://github.com/RSBalchII/anchor-engine-node  
**Whitepaper:** [docs/whitepaper.md](docs/whitepaper.md)  
**Production Status:** ✅ Ready (February 20, 2026)

---

Disclaimer

This software is provided "as is", without warranty of any kind, express or implied. By using this software, you acknowledge that:

    You are responsible for any potential damage to your device.
    You understand that modifying hardware or system behavior may void warranties.
    You will not hold the authors or contributors liable for any outcome resulting from the use of this software.

Use at your own risk.
