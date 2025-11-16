# Anchor - Vision & Implementation Plan

**"Anchor your thoughts. Remember everything. Own your data."**

---

## Executive Summary

Anchor is a terminal-based AI assistant that combines:
- **GitHub Copilot CLI's simplicity** - natural language, no complex commands
- **ECE_Core's memory** - graph-based architecture (Redis + Neo4j)
- **MCP tool ecosystem** - standardized tool integration
- **Local-first sovereignty** - your data, your hardware, your control

Built on the principle that **context cache IS intelligence**, Anchor is an assistive memory tool for developers with enhanced cognitive workflows.

---

## Vision

### The Problem

**Existing terminal AI tools fail in three ways:**

1. **No Memory**: Every conversation starts from zero
   - Can't remember past discussions
   - Can't find related context
   - Can't build on previous work

2. **No Tools**: Pure chat interfaces lack agency
   - Can't search the web
   - Can't access filesystems
   - Can't execute commands
   - Everything requires manual copy-paste

3. **Cloud Dependency**: Data leaves your control
   - Privacy concerns
   - Latency issues
   - Subscription lock-in
   - No offline capability

**Anchor solves all three.**

---

## What Makes Sovereign CLI Different

### 1. Memory-Enhanced Conversations

**Graph-Based Architecture** (via ECE_Core):

```
Redis (Active Cache)
    ↓
"What did we discuss about memory systems?"
    ↓
Neo4j (Graph Database - All memories)
    ↓
Graph traversal finds: "Conversation on Oct 15..."
    ↓
Association: Persistent Memory → Task Management → External Memory → ECE_Core
```

**Result**: The AI remembers your context across days, weeks, months.

### 2. Tool-Empowered Interactions

**MCP Integration** - Model Context Protocol:

```
You: "Search for recent AI research"
    ↓
Tool Detection: Need web search
    ↓
MCP Tool Execute: websearch_search_web(query="AI research")
    ↓
Result: 5 relevant papers found
    ↓
Context Enhancement: "Weather data: 18°C, Cloudy. User asked: ..."
    ↓
LLM Response: "Tokyo is currently 18°C and cloudy."
```

**No manual tool commands. No copy-paste. Just ask.**

**Supported Protocols**:
- HTTP/REST APIs
- CLI commands
- MCP (Model Context Protocol)
- WebSocket streams

### 3. Local-First Sovereignty

**All data stays on YOUR machine**:
- Conversations stored in Neo4j (graph memory)
- Active context in Redis (working memory)
- LLM runs locally (llama.cpp)

**No telemetry. No cloud. No subscription.**

---

## Core Principles

Aligned with ECE_Core philosophy (see `@ECE_Core/README.md`, `@ECE_Core/specs/spec.md`):

### 1. Dead Stupid Simple

**Every line of code earns its place.**

- Current: ~220 lines (forge.py + ece_client.py)
- Target: ~500 lines (with UTCP + pattern detection)
- Comparison: GitHub Copilot CLI is simple; we stay competitive

**No unnecessary abstractions. No premature optimization.**

### 2. Context Cache IS Intelligence

**The memory system is the core capability, not the LLM.**

The LLM is a computation engine. The intelligence comes from:
- Retrieving the right context (Q-Learning graph traversal)
- Maintaining conversation continuity (Redis cache)
- Finding relevant past discussions (SQLite embeddings)

Sovereign CLI is an interface to **your** externalized memory.

### 3. Working > Perfect

**Ship functional simplicity over theoretical elegance.**

- MVP: Basic chat with ECE_Core ✅ (already working)
- V1: UTCP tool integration (next sprint)
- V2: Pattern-based auto-execution (following sprint)
- V3: Enhanced memory visualization (deferred)

Each version is fully functional. No partial features.

### 4. Assistive Memory Tool

**Reduce cognitive load, enhance capability.**

- No complex command syntax to remember
- Natural language all the way
- Visual feedback for everything (tool calls, memory access)
- Graceful errors with clear recovery steps
- Session persistence (never lose context)

**Persistent memory as cognitive augmentation.**

---

## Strategic Positioning

### Compared to GitHub Copilot CLI

| Feature | GitHub Copilot CLI | Anchor CLI |
|---------|-------------------|------------|
| **Natural Language** | ✅ | ✅ |
| **Tool Execution** | ✅ (limited to code/git) | ✅ (extensible MCP) |
| **Memory** | ❌ (stateless) | ✅ (graph-based) |
| **Local-First** | ❌ (cloud models) | ✅ (llama.cpp) |
| **Sovereignty** | ❌ (GitHub servers) | ✅ (your hardware) |
| **Cost** | Subscription | Free |
| **Privacy** | Data to GitHub | 100% local |

**Anchor = Copilot UX + Graph Memory + Local Sovereignty**

### Compared to Other AI Terminals

**vs. Aider** (AI pair programmer)
- Aider: Code-focused, project-centric
- Sovereign: General-purpose, memory-centric

**vs. Shell GPT** (command-line GPT)
- Shell GPT: Stateless, single-turn
- Sovereign: Stateful, multi-turn memory

**vs. ChatGPT CLI** (official OpenAI)
- ChatGPT CLI: Cloud-only, no tools
- Sovereign: Local-first, tool-empowered

**Our niche**: Memory-enhanced, tool-empowered, locally sovereign.

---

## Implementation Roadmap

### Phase 1: Foundation ✅ (Complete)

**Status**: DONE

- [x] Basic Textual TUI
- [x] ECE_Core integration
- [x] Markdown rendering
- [x] Session persistence
- [x] Token display

**Code**: 220 lines  
**Timeline**: Completed

### Phase 2: UTCP Integration 🔄 (Current Sprint)

**Status**: IN PROGRESS

- [ ] UTCP client implementation
- [ ] Manual discovery (fetch from endpoints)
- [ ] Tool catalog display
- [ ] Manual tool execution (/call-tool)
- [ ] Error handling and fallbacks

**Code**: +150 lines (target: 370 total)  
**Timeline**: Week of 2025-11-10

### Phase 3: Pattern Detection 📅 (Next Sprint)

**Status**: PLANNED

- [ ] Pattern configuration (YAML)
- [ ] Keyword-based matching
- [ ] Auto-tool execution
- [ ] Context enhancement
- [ ] Confirmation prompts

**Code**: +100 lines (target: 470 total)  
**Timeline**: Week of 2025-11-17

### Phase 4: Enhanced UI 📅 (Following Sprint)

**Status**: PLANNED

- [ ] Tool execution visualization
- [ ] Memory tier indicators
- [ ] Copy/export features
- [ ] Animated thinking indicator
- [ ] ASCII charts for memory stats

**Code**: +80 lines (target: 550 total)  
**Timeline**: Week of 2025-11-24

### Phase 5: Polish & Documentation 📅

**Status**: PLANNED

- [ ] Comprehensive testing
- [ ] User documentation
- [ ] Developer docs
- [ ] Video demos
- [ ] PyPI packaging

**Code**: Refinement, no major additions  
**Timeline**: December 2025

---

## Success Metrics

### Technical Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Startup Time | <1s | ~0.5s | ✅ |
| Response Time | <5s | ~2s | ✅ |
| Memory Overhead | <100MB | ~40MB | ✅ |
| Tool Discovery | <500ms | N/A | 📅 |
| Code Size | <600 lines | 220 | ✅ |

### User Experience Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Natural Language Input | 100% | ✅ |
| Memory Retrieval | Transparent | 🔄 |
| Tool Auto-Execution | >80% accuracy | 📅 |
| Error Recovery | Clear guidance | ✅ |
| Session Persistence | 100% | ✅ |

### Personal Success Metrics

| Goal | Status |
|------|--------|
| Recall past conversations easily | 🔄 (ECE working) |
| See pattern connections automatically | 📅 (Neo4j pending) |
| Complete multi-step tasks via tools | 📅 (UTCP pending) |
| Feel less cognitive load | ✅ (simple UX) |

---

## Research Foundation

### Graph-R1: Q-Learning for Knowledge Graphs

**Paper**: https://arxiv.org/abs/2507.21892

**Key Insight**: Iterative reasoning over knowledge graphs using reinforcement learning to find optimal traversal paths.

**Application in Sovereign CLI**:
- Neo4j stores conversation graph (Turn → Entity → Turn)
- Q-Learning learns which association paths yield good retrieval
- "What did we discuss when talking about Dory?" → traverses MENTIONS edges

**Status**: Implemented in ECE_Core, exposed via /graph endpoint (not yet used by CLI)

### Markovian Reasoning: Chunked Thinking

**Paper**: https://arxiv.org/abs/2506.21734

**Key Insight**: Small models can achieve deep reasoning by breaking problems into chunks with textual state carryover.

**Application in Sovereign CLI**:
- Long reasoning tasks split into segments
- Each segment's output becomes next segment's input
- Enables 14B models to match 70B performance

**Status**: Implemented in ECE_Core (context_manager.py), transparent to CLI

### Cache-to-Cache (C2C): Cross-Turn Augmentation

**Repo**: https://github.com/Hrishnugg/c2c

**Key Insight**: Augment LLM context cache with retrieved content from previous turns, not just appending to prompt.

**Application in Sovereign CLI**:
- SQLite embeddings enable semantic retrieval
- Retrieved turns augment cache directly
- More efficient than reprompting

**Status**: Theoretical foundation, not yet implemented (future enhancement)

---

## Data Sovereignty Philosophy

### Why Local-First Matters

**Privacy**:
- Your conversations contain personal context
- Medical info, work details, creative ideas
- No third-party access, ever

**Reliability**:
- No internet dependency
- No service outages
- No rate limits
- No subscription cancellations

**Ownership**:
- Your data in SQLite/Neo4j
- Export anytime, anywhere
- Switch models freely
- No vendor lock-in

**Performance**:
- No network latency
- Faster than cloud APIs
- Predictable response times

### The Sovereign Stack

```
┌─────────────────────────────────────────┐
│  You (Human)                            │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  Sovereign CLI (Terminal Interface)     │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  ECE_Core (Memory System)               │
│  ├─ Redis (localhost:6379)             │
│  ├─ SQLite (./ece_memory.db)           │
│  └─ Neo4j (localhost:7687)             │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  llama.cpp (Local LLM)                  │
│  └─ DeepSeek-R1-Distill-Qwen-14B       │
└─────────────────────────────────────────┘
```

**Every component runs on YOUR machine.**

---

## Target Users

### Primary: Developers Needing Persistent Context

**Pain Points**:
- Memory decay (conversations forgotten)
- Context switching costs (lose train of thought)
- Complex multi-step tasks requiring context retention
- Information overload (can't find what I discussed last week)

**How Sovereign CLI Helps**:
- External memory that never forgets
- Graph connections reveal forgotten associations
- Tools reduce manual steps
- Natural language lowers cognitive barriers

### Secondary: Privacy-Conscious Developers

**Pain Points**:
- Don't trust cloud AI with proprietary code
- Subscription costs add up
- Vendor lock-in concerns
- Performance unpredictability

**How Anchor Helps**:
- 100% local, zero telemetry
- Free (just compute costs)
- Export data anytime
- Predictable, private

### Tertiary: AI Power Users

**Pain Points**:
- Existing tools too limited (chat-only)
- Want tool integration (web search, file ops, etc.)
- Need long-term memory
- Demand customization

**How Anchor Helps**:
- Extensible via MCP
- Graph-based memory architecture
- Open source, hackable
- Plugin system (future)

---

## Competitive Moats

### 1. ECE_Core Integration

**Unique Advantage**: Graph-based memory system with persistent context.

- Neo4j: Graph database for all memories with association traversal
- Redis: Active context cache
- Markovian reasoning: Chunked thinking loops

**Barrier to entry**: Building ECE_Core took months. Replicating it is non-trivial.

### 2. MCP Ecosystem

**Unique Advantage**: Protocol-standard tool integration (Model Context Protocol).

Most AI tools hardcode integrations. MCP is standardized, extensible, and growing.

**Barrier to entry**: MCP adoption is growing. Standards-based approach future-proofs integration.

### 3. Local-First Philosophy

**Unique Advantage**: Truly sovereign, no cloud dependencies.

GitHub Copilot CLI requires cloud. Aider, Shell GPT, others default to cloud.

**Barrier to entry**: Local models need good hardware, but commodity GPUs (RTX 3060) now work.

### 4. Simplicity

**Unique Advantage**: ~500 lines of focused code vs. thousands.

Copilot CLI is closed-source. Open-source competitors are bloated.

**Barrier to entry**: Simplicity is a discipline, not a feature. Hard to maintain.

---

## Risks & Mitigations

### Risk: UTCP Adoption Slow

**Impact**: Fewer available tools, less utility

**Mitigation**:
- Build core tools ourselves (web search, file ops, git)
- Support HTTP APIs directly (OpenAPI ingestion)
- MCP protocol support (broader ecosystem)

### Risk: Local Models Lag Cloud

**Impact**: Response quality lower than GPT-4

**Mitigation**:
- Target "good enough" not "perfect"
- Leverage memory to compensate (context > raw intelligence)
- Support cloud fallback (optional)

### Risk: Complexity Creep

**Impact**: Code bloat, maintenance burden

**Mitigation**:
- Strict line-count budget (600 max)
- Every feature must justify existence
- Deferred features list (resist scope creep)

### Risk: User Adoption Low

**Impact**: Project doesn't gain traction

**Mitigation**:
- Scratch our own itch (built for us first)
- Document extensively (videos, guides)
- Engage developer communities interested in productivity tools

---

## Next Steps (Current Sprint)

**Priority 1**: Security Hardening
- Add security warnings to README ✅
- Implement tool sandboxing (SAFE_TOOLS vs DANGEROUS_TOOLS)
- Add input sanitization for shell_execute
- Create .env.example with security warnings

**Priority 2**: Testing Infrastructure
- Create tests/ directory with pytest
- Add health check tests
- Add memory retrieval tests
- Add tool call parsing tests

**Priority 3**: Tool Reliability
- Implement tool call confidence scoring
- Add tool call repair layer for malformed calls
- Add few-shot examples in system prompts
- Implement guided mode for ambiguous tools

**Priority 4**: Documentation
- Create TROUBLESHOOTING.md (consolidate scattered docs) ✅
- Add resource requirements to README ✅
- Clean up unused dependencies
- Version releases with git tags

**Priority 5**: Quick Wins
- Create one-command setup script
- Add dependency audit and cleanup
- Better error messages
- Performance metrics

---

## Critique Response (2025-11-14)

**Received**: Comprehensive critique identifying improvements from B+ to A-grade project

### Strengths Validated ✅
- Clear philosophy & vision (Dead Stupid Simple)
- Well-documented architecture
- Smart technical choices (tiered memory, MCP integration)
- Production-ready practices (logging, config, error handling)

### Improvements Identified & Planned

**1. Security (CRITICAL)** 📅
- Tool sandboxing for shell_execute
- Input sanitization
- Rate limiting on endpoints
- Session validation/authentication
- Security warnings in documentation
→ **Tasks**: T-100 to T-103 created

**2. Testing Coverage (HIGH)** 📅
- No automated tests currently
- Need pytest suite
- Smoke tests required
- Integration tests needed
→ **Tasks**: T-110 to T-112 created

**3. Tool Reliability (HIGH)** 📅
- Small models (<14B) unreliable for tool calls
- Need confidence scoring
- Need tool call repair layer
- Need guided mode for ambiguous calls
→ **Tasks**: T-200 to T-203 created

**4. Dependency Management (MEDIUM)** 📅
- Unused UTCP dependencies suspected
- Need dependency audit
- Need version pinning
→ **Tasks**: T-120 to T-121 created

**5. Documentation (MEDIUM)** 📅
- Scattered troubleshooting info
- Missing resource requirements
- No version tagging
→ **Tasks**: T-130 to T-132 created

**6. Architecture (LOW)** 📅
- MCP server coupling to Anchor
- Async event loop complexity
→ **Tasks**: T-320 to T-321 created

### Quick Wins Completed ✅
- ✅ Security warnings added to README
- ✅ Resource requirements documented
- ✅ Troubleshooting section enhanced
- ✅ Project status roadmap added

### Implementation Plan

**This Week** (2025-11-14 to 2025-11-21):
- Complete documentation updates
- Create doc_policy.md
- Create tasks.md with all improvement tasks
- Update plan.md with critique response

**Next Sprint** (2025-11-22 to 2025-11-29):
- Security hardening (T-100 to T-103)
- Dependency cleanup (T-120 to T-121)
- TROUBLESHOOTING.md creation (T-130)

**Following Sprint** (2025-11-30 to 2025-12-06):
- Test suite implementation (T-110 to T-112)
- Tool reliability improvements (T-200 to T-203)

**Month 2**:
- Advanced features (memory visualization, telemetry)
- Architecture improvements (decouple MCP, async cleanup)

---

## Long-Term Vision (12-18 Months)

**Portable Deployment**:
- Run on Android phone (Termux + ECE_Core)
- 4GB RAM target
- Offline-first
- Voice input/output

**Collaborative Sessions**:
- Share session with team
- Multi-user real-time collaboration
- Permission system

**Plugin Ecosystem**:
- Community-contributed tools
- Plugin marketplace
- Custom pattern libraries

**But first**: Get the basics right. Simple. Working. Sovereign.

---

## Acknowledgments

**Inspiration**:
- GitHub Copilot CLI (UX gold standard)
- ECE_Core (memory architecture)
- UTCP (tool protocol)

**Research**:
- Graph-R1 (Q-Learning for graphs)
- Markovian Reasoning (chunked thinking)
- Cache-to-Cache (context augmentation)

**Community**:
- Developers who need persistent context and assistive memory tools
- Local-first advocates who demand this
- Open-source contributors who will build this

---

**"Your mind, augmented. Your data, sovereign. Your tool, open."**

— Sovereign CLI Team
