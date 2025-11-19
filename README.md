# Anchor

**Copilot CLI for ECE_Core – Memory-Enhanced Terminal AI**

[![Status](https://img.shields.io/badge/status-alpha-orange)]()
[![Lines](https://img.shields.io/badge/lines-~150-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

> *"Your mind, augmented. Your data, sovereign. Your tool, open."*

Anchor is a lightweight terminal-based AI assistant that brings GitHub Copilot CLI's simplicity to ECE_Core's memory architecture (Redis + Neo4j). Built as an assistive memory tool for developers, it provides persistent memory across sessions, automatic context retrieval, and real-time streaming responses.

**Key Features:**
- ✅ **Lightweight CLI**: No bloat, just simple prompts (~150 lines)
- ✅ **Real-Time Streaming**: See responses token-by-token as they generate
- ✅ **Memory-Enhanced**: Persistent context with automatic retrieval (Redis + Neo4j)
- ✅ **Local-First**: 100% on-device, zero telemetry, your data stays yours
- ✅ **Graceful Degradation**: Works with or without memory backends
- ⚠️ **Embedded MCP Server (ARCHIVED)**: The embedded MCP tools were moved to an archive and are no longer enabled by default. See `anchor/mcp/ARCHIVED.md` and `archive/removed_tool_protocols/mcp-utcp/anchor/mcp/` for details.
- ✅ **🚀 Simple Tool Mode**: Pattern-based tool execution for small models (4B-8B) - NEW! (2025-11-15)
- ✅ **Security Hardening**: Shell whitelist, path protection, API authentication (2025-11-14)
- ✅ **Testing Infrastructure**: 18 automated tests, 50%+ coverage target (2025-11-14)

---

## ⚠️ SECURITY WARNING

**CRITICAL - READ BEFORE USE:**

- **shell_execute tool can run arbitrary commands** on your system
- **DO NOT expose ECE_Core or Anchor to public networks** without authentication
- **Use .env to configure trusted tool execution paths**
- **Review tool calls before execution** when using small models (<14B parameters)
- This is a **local development tool** - not designed for production/multi-user environments

**Small Model Support:**
- ✅ **Simple Tool Mode** makes 4B-8B models reliably use tools (95%+ success rate)
- Pattern-based execution bypasses complex LLM prompting
- Toggle with `/simple` command
- See `SIMPLE_MODE_GUIDE.md` for details
- **Recommended**: Works great with Qwen3-8B, Gemma-3-4B, or larger models

---

## Quick Start

### Resource Requirements

**Minimum:**
- **CPU**: 4+ cores recommended
- **RAM**: 8GB (4B model = ~3GB, 14B model = ~8GB)
- **Disk**: 10GB free (models + databases)
- **Startup**: 5-10 seconds (first run may take longer)

**Recommended:**
- **RAM**: 16GB+ for 14B+ models
- **GPU**: NVIDIA GPU with 8GB+ VRAM for faster inference
- **SSD**: For faster model loading

### Prerequisites
- Python 3.10+
- ECE_Core running on localhost:8000
- llama.cpp server running on localhost:8080 (optional - can use any OpenAI-compatible endpoint)
- Redis (optional - for caching)
- Neo4j (optional - for graph memory)

### Installation

```bash
# Install dependencies
uv pip install -e .

# Or with pip
pip install -e .
```

**Start in 2 Terminals:**

**Terminal 1 - ECE_Core:**
```bash
cd C:\Users\rsbiiw\Projects\ECE_Core
.\dist\ECE_Core.exe
# Or: python launcher.py
```

**Terminal 2 - Anchor CLI (includes MCP server):**
```bash
cd C:\Users\rsbiiw\Projects\anchor
python main.py
# MCP server starts automatically with Anchor
```

---

## Usage

Once running, just start typing:

```
============================================================
  Anchor - Personal Cognitive Command Center
============================================================
  Type your message (Ctrl+C to quit, 'help' for commands)

You: what are my recent memories?
Assistant: Based on your memory system, here are recent items...

You: help
Commands:
  exit, quit    - Exit Anchor
  clear         - Clear terminal
  help          - Show this help

You: exit
👋 Goodbye!
```

---

## Commands

| Command | Purpose |
|---------|---------|
| `exit` / `quit` | Exit Anchor |
| `clear` | Clear terminal |
| `help` | Show help |

Everything else is sent to ECE_Core for processing.

---

## How It Works

1. **You type a message** in the terminal
2. **Message is sent to ECE_Core** which retrieves relevant memories and context
3. **LLM processes** your message with full context
4. **Response streams** back token-by-token in real-time
5. **Memory is automatically updated** after each response

---

## Project Structure

```
anchor/
├── main.py              # Copilot CLI entry point
├── pyproject.toml       # Package configuration
├── README.md            # This file
├── specs/               # Design specifications
└── .env                 # Configuration (create from .env.example)
```

---

## Configuration

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Environment variables:
- `ECE_URL` - ECE_Core API URL (default: http://localhost:8000)
- `SESSION_ID` - Session identifier (default: anchor-session)

---

## FAQ

**Q: Why no fancy TUI?**
A: Simplicity over feature creep. Copilot CLI is our inspiration – fast, focused, works everywhere.

**Q: Does it work without ECE_Core?**
A: No, but ECE_Core works standalone. This is the CLI for it.

**Q: Can I use a different LLM?**
A: Yes! As long as it has an OpenAI-compatible API and ECE_Core can reach it.

**Q: How does streaming work?**
A: ECE_Core sends responses as Server-Sent Events (SSE). This CLI displays them as they arrive.

**Q: Are my conversations private?**
A: Yes! 100% local. No telemetry, no cloud, no tracking. Your data never leaves your machine.

**Q: What about the shell_execute tool security?**
A: The shell tool is DANGEROUS by design. Only use in trusted environments. We plan to add sandboxing (see specs/tasks.md).

---

## Troubleshooting

### Common Issues

**"Cannot connect to ECE_Core"**
- Ensure ECE_Core is running: `cd ../ECE_Core && python launcher.py`
- Check ECE_Core is listening on port 8000: `curl http://localhost:8000/health`
- Verify .env has correct ECE_URL

**"Tool calls not working"**
- **Most common**: Model is too small (<14B parameters)
- Solution: Use 14B+ parameter model or enable tool confirmation mode
- Check MCP server is running: Should start automatically with Anchor

**"Redis unavailable"**
- This is OK! System works without Redis (uses Neo4j)
- To enable caching: Install and run Redis (`redis-server`)

**"Neo4j unavailable"**
- This is REQUIRED for memory features
- Install Neo4j Desktop: https://neo4j.com/download/
- Configure in ECE_Core's .env

**"Responses seem generic / no memory"**
- Ensure ECE_Core has memories loaded
- Test: `curl http://localhost:8000/health`
- Check ECE_Core logs for memory retrieval errors

**"MCP server won't start"**
- Check port 8008 is not in use
- Review Anchor logs for startup errors
- Try manual start: `cd mcp && python server.py`

For more help, see specs/TROUBLESHOOTING.md (coming soon) or file an issue.

---

## Development

### Run from source

```bash
cd C:\Users\rsbiiw\Projects\anchor
python main.py
```

### Install in editable mode

```bash
uv pip install -e .
anchor  # now you can run it from anywhere
```

---

## License

MIT – Use, modify, and distribute freely.

---

## Related Projects

- **[ECE_Core](../ECE_Core)** – The backend (memory, LLM, context management)
- **[GitHub Copilot CLI](https://github.com/github/gh-copilot-cli)** – Our design inspiration
- **[llama.cpp](https://github.com/ggml-org/llama.cpp)** – LLM inference engine

---

## Project Status & Roadmap

**Current Version**: v0.1.0-alpha

### What's Working ✅
- Core chat functionality
- Memory retrieval (Redis + Neo4j)
- MCP tool integration
- Real-time streaming
- Session persistence

### What's Next 🔄
- **Security hardening** (tool sandboxing, input sanitization)
- **Automated testing** (pytest suite, integration tests)
- **Tool reliability** (confidence scoring, repair layer)
- **Better onboarding** (one-command setup)

### What's Planned 📅
- Memory visualization web UI
- Advanced tool telemetry
- Plugin ecosystem
- Voice interface

See **specs/tasks.md** for detailed roadmap and **specs/plan.md** for long-term vision.

---

Made with ❤️ for neurodivergent hackers who just want their tools to work.

**"Your mind, augmented. Your data, sovereign. Your tool, open."**

---

## Developer TODOs & Roadmap (Priorities)

This section summarizes the highest-priority developer tasks and practical next steps for Anchor.
These items are actionable and aligned with the project's `specs/tasks.md` roadmap.

High priority
- Security & Safety: harden `shell_execute` by default, maintain a strict whitelist, add confirmation flows, and document safe sandbox patterns in specs.
- Tool Reliability: add a tool-call parser, confidence scoring, and a repair layer for malformed tool outputs. Keep Simple Tool Mode as the primary workaround for small models.
- Tests & CI: add or expand unit tests for parsing, tool execution, and security enforcement; add GitHub Actions for linting and test runs.

Medium priority
- Developer Onboarding: add a streamlined `run_dev` script or `docker-compose` that starts the LLM server, ECE_Core, Anchor, Redis and Neo4j with dev-friendly config.
- Observability: add structured logs and minimal Prometheus counters (tool calls, tool failures, memory hits).

Quick Wins (first 3–7 days)
- Add pre-commit for formatting and linting (Black, ruff) and a simple CI stub.
- Add a `.env.example` and improve `README.md` startup commands with a single `start-all` / `start-dev` helper.
- Add unit tests for the parser, the whitelist, and the simple tool mode.

If you'd like help implementing any of the tasks above (CI, tests, parser, sandboxing), I can start by adding a GitHub Actions CI and a minimal test that validates the tool parsing and whitelist behavior.

---

## Documentation Consolidation
Most of the advanced documentation (Simple Mode guides, troubleshooting, implementation and integration reports) was consolidated under `specs/` to simplify discovery and maintenance. Please check the following canonical locations:
- `specs/simple_mode_guide.md` - Full Simple Mode guide and quickref
- `specs/simple_mode_tests.md` - Pattern tests and testing guide
- `specs/troubleshooting.md` - Anchor troubleshooting guide (consolidated)
- `specs/implementation_summary.md` - Implementation and completion reports

Root-level documents that were migrated are deprecated and will be removed during the next cleanup.
start.bat
# Wait for: "🎯 ECE_Core running at http://127.0.0.1:8000"
```

**Terminal 3 - Anchor:**
```bash
cd C:\Users\rsbiiw\Projects\anchor
python anchor.py
```

**Health checks:**
```bash
# Test LLM
curl http://localhost:8080/v1/models

# Test ECE_Core
curl http://localhost:8000/health

# Test memory
curl http://localhost:8000/health
```

System works with just SQLite (Tier 1).

---

## Optional Memory Tiers

Sovereign CLI implements graceful degradation across three optional memory tiers:

### Tier 1: SQLite (REQUIRED ✅)
- **Status**: WORKING (13,444 memories imported)
- **Purpose**: Persistent long-term memory storage
- **Usage**: Keyword/tag search, primary knowledge base
- **Standalone**: Works without Redis or Neo4j

### Tier 2: Redis (OPTIONAL 🔄)
- **Status**: Graceful fallback implemented
- **Purpose**: Working memory for active conversations
- **Usage**: Session context caching (8k tokens), faster retrieval
- **Fallback**: Uses SQLite summaries if unavailable

### Tier 3: Neo4j (OPTIONAL ⏸️)
- **Status**: Awaiting installation
- **Purpose**: Semantic memory and relationship mapping
- **Usage**: Association discovery, thought chain reconstruction
- **Fallback**: Uses keyword search if unavailable

**To add Redis:**
```bash
redis-server
```

**To add Neo4j:**
```bash
# Install Neo4j Desktop: https://neo4j.com/download/
# Then run from ECE_Core:
python build_knowledge_graph.py
```

---

## Usage

### Basic Chat
```
You @ 14:22:05
┌──────────────────────────────────┐
│ Tell me about task management    │
└──────────────────────────────────┘

Assistant @ 14:22:08 (847 tokens)
┌──────────────────────────────────┐
│ [Retrieved 3 memories from July] │
│                                  │
│ Based on past discussions:       │
│ - External memory systems...     │
│ - Structured task tracking...    │
│ - Context preservation...        │
└──────────────────────────────────┘
```

### Keyboard Shortcuts
- **Ctrl+C**: Quit
- **Ctrl+L**: Clear display (memory intact)
- **Ctrl+I**: Session info (tokens, memories)

### Configuration (.env)
```env
# ECE_Core Connection
ECE_URL=http://localhost:8000
ECE_TIMEOUT=60

# Session Settings
SESSION_ID=default
AUTO_SESSION_ID=true

# Display Settings
SHOW_TOKEN_COUNT=true
SHOW_TIMESTAMPS=true
```

---

## Architecture

```
┌─────────────────────────────────┐
│  Anchor                         │
│  (Terminal Interface)           │
└────────────┬────────────────────┘
             │ HTTP
             ↓
┌─────────────────────────────────┐
│  ECE_Core                       │
│  (Memory Orchestration)         │
└────────────┬────────────────────┘
             │
    ┌────────┼────────┐
    ↓        ↓        
 Redis     Neo4j
(Cache)  (Primary)
Optional Required
```

**Philosophy**: Memory-enhanced workflows with graceful degradation (Redis + Neo4j).

---

## Project Structure

```
Anchor/
├── anchor.py                  # Main TUI (~191 lines)
├── ece_client.py              # ECE API client (~50 lines)
├── requirements.txt           # Dependencies
├── .env.example               # Config template
├── README.md                  # This file
├── CHANGELOG.md               # Project history
└── specs/
    ├── spec.md                # Technical architecture
    ├── plan.md                # Vision & roadmap
    └── tasks.md               # Implementation tasks
```

**Total Code**: ~240 lines | **Target**: <600 lines with all features

---

## Core Principles

Aligned with ECE_Core philosophy:

1. **Dead Stupid Simple** - Every line earns its place (~240 lines)
2. **Context Cache IS Intelligence** - Memory system is the core
3. **Local-First Sovereignty** - Your data, your hardware
4. **Working > Perfect** - Ship functional, iterate
5. **Assistive Memory Tool** - Reduce cognitive load, enhance capabilities

**Optional Tiers Philosophy**:
- Neo4j (Primary) - Graph storage for all memories
- Redis (Optional) - Hot cache for active sessions
- **Never breaks** - graceful degradation everywhere

---

## Troubleshooting

### "Cannot connect to ECE_Core"
→ Start ECE_Core: `cd ..\ECE_Core && .\start.bat`
→ Check ECE_Core is on port 8000

### "Redis unavailable"
→ **This is OK!** System works with Neo4j alone
→ To enable caching: `redis-server`

### "Neo4j unavailable"
→ **This is REQUIRED** Neo4j is the primary storage
→ To enable: Install and start Neo4j

### Responses seem generic
→ Ensure ECE_Core has memories loaded
→ Check: `GET http://localhost:8000/memories/search?tags=test`

---

## Development Roadmap

### Current (Week 1)
- [x] Basic TUI implementation
- [x] ECE_Core integration
- [x] SQLite memory retrieval
- [x] Session persistence
- [x] Documentation consolidation
- [ ] Optional Redis refactor

### Next (Week 2)
- [ ] Neo4j integration
- [ ] Graph traversal for associations
- [ ] Entity extraction from memories

### Following (Week 3)
- [ ] UTCP tool integration
- [ ] Pattern-based auto-execution
- [ ] Enhanced UI visualization

### Future
- [ ] PyInstaller portable build
- [ ] Voice input/output
- [ ] Plugin system

---

## Documentation

- **README.md** (this file) - Quick start and overview
- **specs/spec.md** - Technical architecture and API specification
- **specs/plan.md** - Vision, philosophy, and strategic positioning
- **specs/tasks.md** - Implementation roadmap and task tracking
- **CHANGELOG.md** - Project history and decision log

All other documentation has been consolidated into these core files.

---

## Target Users

### Primary: Developers Needing Persistent Context
**Pain Points**: Memory decay, context switching, maintaining long-term project knowledge  
**Solution**: External memory that never forgets, with low cognitive load

### Secondary: Privacy-Conscious Developers  
**Pain Points**: Cloud dependency, data sovereignty, vendor lock-in  
**Solution**: 100% local, zero telemetry, own your data

### Tertiary: AI Power Users
**Pain Points**: Need long-term memory, tool integration, customization  
**Solution**: Memory-enhanced workflows, extensible architecture, open source

---

## Acknowledgments

**Inspiration**:
- GitHub Copilot CLI (UX gold standard)
- ECE_Core (memory architecture)
- External-Context-Engine-ECE (portable deployment)

**Research**:
- Graph-R1: Q-Learning for knowledge graphs
- Markovian Reasoning: Chunked thinking
- Cache-to-Cache: Context augmentation

---

**Status**: ✅ Alpha - Core functionality working, enhancements planned

**License**: MIT

**"Anchor your thoughts. Remember everything. Own your data."**
