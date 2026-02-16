# Anchor OS Development Roadmap

> Last revised: February 2026

## Vision

Anchor OS is a **sovereign, local-first personal knowledge engine** — an offline-capable AI memory system with physics-based associative search, multi-channel agent integration, and local LLM inference. All data stays on your machine. No cloud. No API keys. Full sovereignty.

## What We Built (Completed)

### Atomic Knowledge Architecture
- [x] Compound → Molecule → Atom decomposition pipeline
- [x] Byte-offset pointer system (DB routes, filesystem stores)
- [x] SimHash deduplication via native C++ (`@rbalchii/native-fingerprint`)
- [x] NLP entity extraction and semantic tagging
- [x] Watchdog file watcher with auto-ingestion from inbox directories
- [x] Multi-bucket knowledge organization (`notebook`, `inbox`, `external`, `quarantine`)

### Physics-Based Search (Tag-Walker → Universal Semantic Search)
- [x] "Planets and Moons" model — direct hits + graph-discovered associations
- [x] SQL bipartite graph traversal (atoms ↔ tags) via CTE-optimized JOINs
- [x] Weighted reservoir sampling with temperature for serendipity
- [x] 70/30 distributed budget (keyword/associative split)
- [x] Adaptive radius context inflation (200B–5KB windows)
- [x] Deterministic Semantic Expansion (synonym ring, no LLM needed)
- [x] Temporal context extraction ("last 3 months", date ranges)
- [x] Graph-Context Serializer with intent detection
- [x] Sovereign System Prompt — LLM narrates physics results, stays in the graph

### Memory Lifecycle
- [x] Dreamer Service — background Markovian summarization on cron schedule
- [x] Temporal tagging (season, quarter, time-of-day)
- [x] Epochal Historian (identifies Epochs, Episodes, Entities)
- [x] Mirror Protocol — filesystem mirroring with YAML rehydration
- [x] Tag Infection — generator-based streaming tag propagation
- [x] BERT NER teacher (GliNER) with lazy loading + auto-unload

### Split-Brain Architecture
- [x] Anchor Engine (port 3160) — knowledge DB, search, ingestion
- [x] Inference Server (port 3001) — dedicated LLM server with engine abstraction
- [x] Nanobot (port 8080) — sovereign agent with tools, memory, multi-channel chat
- [x] Anchor UI (port 5173) — React dashboard with search, chat, monitoring
- [x] OpenAI-compatible API across all services
- [x] ProcessManager for child service lifecycle

### Infrastructure
- [x] Centralized `user_settings.json` configuration
- [x] PGlite embedded PostgreSQL (zero-install DB)
- [x] Native C++ modules (`native-atomizer`, `native-fingerprint`, `native-keyassassin`, `native-vector`)
- [x] Engine test suite (10 sections, 38+ test files)
- [x] Electron desktop overlay with system tray
- [x] Web research pipeline (scrape → Markdown → ingest)
- [x] Cross-platform launch scripts (Windows `.bat`, Unix `.sh`)
- [x] Log rotation and structured logging (Winston)

### API Surface (32+ endpoints)
- [x] Ingestion, Search, Atom management, Bucket/Tag listing
- [x] Backup/Restore, Dreamer trigger, Research scraping
- [x] Scribe (Markovian state), System config, Health checks
- [x] LLM proxy (chat completions, model load/unload/status)
- [x] Debug SQL, graph data, terminal exec
- [x] API key authentication middleware
- [x] Request body validation middleware

### Nanobot Agent Framework
- [x] Node.js server with agent loop (tool execution, state updates)
- [x] Python agent framework with message bus architecture
- [x] Multi-channel: Discord, Telegram, WhatsApp, DingTalk, Feishu
- [x] Tool registry: shell, filesystem, web, GitHub, cron, spawn
- [x] Progressive skill loading (summaries in prompt, full on demand)
- [x] Hybrid XML/Markdown persistent memory with Dreaming Protocol
- [x] Subagent spawning for background tasks

---

## Phase 1: Hardening (Q1 2026)

**Focus**: Production readiness, stability, and security

### Security & Reliability
- [x] API key authentication across all services
- [x] Request validation on all mutation endpoints
- [ ] Path traversal protection on model load endpoints
- [ ] Command execution allowlist (replace deny-list in nanobot tools)
- [ ] Rate limiting on public-facing endpoints
- [ ] Input sanitization for SQL/injection vectors

### Bug Fixes
- [x] Fix nanobot missing memory functions (`getRecentMemories`, `searchMemories`, `clearMemory`)
- [x] Fix nanobot worker missing `unloadModel` handler
- [ ] Fix nanobot session recreation on every request (preserve conversation context)
- [ ] Fix inference-server `EngineManager.switchEngine()` — `from` field bug
- [ ] Fix MNNEngine concurrent request handling (add request ID tracking)
- [ ] Fix `set-env-vars.js` to actually propagate environment variables
- [ ] Fix `start.bat` hardcoded paths → use relative paths
- [ ] Achieve Windows/Unix launch script parity

### Testing
- [x] Anchor Engine: Integration test suite (10 sections)
- [x] Nanobot: Fix test imports and memory function tests
- [ ] Inference Server: Add test suite (model load/unload, chat completions, engine switch)
- [ ] Anchor UI: Add Vitest + React Testing Library for component tests
- [ ] Add smoke test script that validates all services start and respond to health checks

---

## Phase 2: Intelligence & UX (Q2 2026)

**Focus**: Deeper search, better UI, conversation quality

### Search Enhancements
- [ ] Multi-turn conversation context in chat (send history to LLM)
- [ ] Cross-session memory bridging — recall relevant past conversations
- [ ] Audio ingestion pipeline (Whisper → atoms)
- [ ] Image/OCR ingestion (vision model → text → atoms)
- [ ] Search result explanation — show *why* each result was surfaced

### UI Polish
- [ ] Replace hash-based routing with proper router (React Router / TanStack Router)
- [ ] Replace `alert()`/`confirm()` with modal components
- [ ] Wire up MonitoringDashboard to a route
- [ ] Add conversation persistence (localStorage or API-backed)
- [ ] Fix Vite proxy for `/monitoring/*` routes
- [ ] Complete TaxonomyPage (replace mock data with live API)

### Agent Improvements
- [ ] Streaming SSE support in nanobot chat completions
- [ ] Conversation history in agent loop (multi-turn context)
- [ ] Improved tool safety (sandboxed execution environment)
- [ ] Agent skill marketplace — share/install skill packs

---

## Phase 3: Ecosystem (Q3-Q4 2026)

**Focus**: Integrations, developer experience, community

### Developer Experience
- [ ] VS Code extension — sidebar for search, context injection, chat
- [ ] CLI tool for ingestion, search, backup from terminal
- [ ] REST API documentation (OpenAPI/Swagger spec)
- [ ] Developer getting-started guide and tutorials
- [ ] Plugin system for custom ingestion pipelines

### Operations
- [ ] GitHub Actions CI pipeline (build, lint, test)
- [ ] Docker Compose for one-command deployment
- [ ] Health dashboard with alerting
- [ ] Automated backup scheduling
- [ ] Performance regression testing in CI

### Advanced Features
- [ ] Federated knowledge — sync between Anchor OS instances (P2P, encrypted)
- [ ] Collaborative memory spaces (shared buckets)
- [ ] Mobile companion app (read-only search + quick capture)
- [ ] Plugin API for third-party integrations

---

## Design Principles

1. **Sovereignty First** — Your data stays on your machine. Always.
2. **Physics Over Magic** — Search is deterministic graph traversal, not black-box embeddings.
3. **LLM as Narrator** — The model weaves results into language; it doesn't think for you.
4. **Atoms Are Forever** — Content is decomposed once, queryable forever, across formats.
5. **Offline by Default** — Everything works without internet. Cloud is opt-in.

## Success Metrics

| Metric | Target | Current |
|---|---|---|
| Search latency (p95) | < 200ms | ~150ms |
| Ingestion throughput | > 100 atoms/sec | Achieved |
| Memory window efficiency | > 90% relevant | ~85% |
| API endpoint coverage | 100% validated | ~60% (WIP) |
| Test coverage (engine) | > 80% integration | ~70% |
| Cross-platform parity | Full | Partial (Windows-led)