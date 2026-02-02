# ECE_Core - 🧠 Sovereign Context Engine (LLM Developer Edition)

> **The Browser Paradigm for AI Memory**: Just as web browsers allow any device to access the internet by loading only needed content, ECE allows any device to process massive AI context by retrieving only relevant "atoms" for current thought.

> **The Semantic Shift**: The ECE now implements Standard 084 - transforming from a keyword indexer to a semantic graph with relationship narrative discovery capabilities.

## 🚀 Quick Start for LLM Developers

### Prerequisites
- Node.js 18+
- Python 3.x (for native module compilation)
- Build tools (Visual Studio Build Tools on Windows, Xcode on macOS)

### Installation
```bash
# Clone the repository
git clone https://github.com/External-Context-Engine/ECE_Core.git
cd ECE_Core

# Install dependencies
pnpm install

# Build the engine
pnpm build
```

### Platform-Specific Setup
*   **Universal**: No manual binary placement required. The engine uses **PGlite** (Postgres in WASM) for universal compatibility.
*   **Native Modules**: Automatically built via `npm run build:native`.

### Running the Engine
```bash
# Start the engine
pnpm start

# Health check
curl http://localhost:3000/health
```

## 🌐 The Browser Paradigm for AI Memory

ECE_Core implements what we call the "Browser Paradigm" for AI memory systems. Just as web browsers allow any machine to render the internet by downloading only the shards (HTML/CSS/JS) it needs for the current view, ECE allows any machine to process massive AI context by retrieving only the atoms required for the current thought.

### Key Principles:
- **Universal Compatibility**: Runs on any device from smartphones to servers
- **Selective Loading**: Only load relevant "atoms" for current query instead of entire dataset
- **Cross-Platform**: Consistent performance across different operating systems
- **Local-First**: All data remains on user's device for privacy and sovereignty
- **Decentralized Architecture**: No central authority or cloud dependency

## 🔧 Architecture Overview (For LLM Developers)

```
┌─────────────────────────────────────────────────────────────┐
│                    Node.js Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │   API       │  │   Search    │  │   Ingestion      │   │
│  │  Service    │  │  Service    │  │   Pipeline     │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
└─────────────┬──────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                 N-API Boundary                            │
└─────────────┬──────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                   C++ Performance Layer                   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  Atomizer   │  │ Key Assassin│  │   Fingerprint    │   │
│  │             │  │             │  │    (SimHash)     │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Components (For LLM Developers)

1. **Node.js Shell**: Handles networking, OS integration, and orchestration
2. **N-API Boundary**: Stable interface between JavaScript and C++
3. **C++ Performance Layer**: Critical operations for speed and efficiency

## 🎯 Core Features (For LLM Developers)

### 1. Tag-Walker Protocol
- Graph-based associative retrieval instead of vector search
- Millisecond retrieval of millions of tokens
- Deterministic results (no probabilistic failures)

### 2. Data Atomization
- Breaks content into semantic "atoms" (thought units)
- Preserves meaning while enabling efficient retrieval
- Supports both code and prose atomization

### 3. SimHash Deduplication
- 64-bit fingerprints for O(1) deduplication
- Identifies near-duplicate content across large corpora
- Reduces storage and processing requirements

### 4. Bright Node Protocol
- Selective graph illumination for reasoning
- Only relevant nodes loaded into memory
- Enables "Logic-Data Decoupling"

## 📖 Usage Examples (For LLM Developers)

### Searching Your Context
```bash
curl -X POST http://localhost:3000/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "my project status",
    "max_chars": 20000
  }'
```

### Ingesting New Content
```bash
curl -X POST http://localhost:3000/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Project update: Completed the initial design phase...",
    "source": "project_notes",
    "tags": ["#project", "#update"]
  }'
```

### Getting Bright Nodes (Graph Structure)
```bash
curl -X POST http://localhost:3000/v1/memory/bright-nodes \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning research",
    "maxNodes": 30
  }'
```

## 🏗️ Development (For LLM Developers)

### Building Native Modules
```bash
# Build the native modules
cd engine
npm run build:native

# Build everything
npm run build:universal
```

### Running Tests
```bash
npm test
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Philosophy
- **Simplicity**: Prefer simple solutions over complex ones
- **Universality**: Code should run on any platform
- **Privacy**: All data stays with the user
- **Openness**: Transparent, auditable codebase

## 📄 License

Elastic License 2.0. Copyright (c) 2026 External Context Engine. See [LICENSE](LICENSE) for full terms.

## 🙏 Acknowledgments

- Inspired by the universal accessibility of web browsers
- Built with the power of Node.js and C++ N-API
- Designed for cognitive sovereignty and privacy

---

*Part of the Sovereign Context Protocol initiative to democratize AI memory systems.*

---

## 🚀 Hybrid Architecture (The "Iron Lung" Protocol)

ECE_Core implements a **hybrid architecture** combining Node.js orchestration with high-performance C++ native modules for critical path operations:

- **Node.js**: Application logic, I/O handling, and service orchestration
- **C++ Native Modules**: Performance-critical text processing (refinement, atomization, deduplication)
- **Zero-Copy Operations**: Using `std::string_view` to avoid unnecessary memory allocation
- **Graceful Degradation**: Falls back to JavaScript implementations if native modules unavailable

### Platform Notes
- **Linux/macOS/Windows**: Full functionality with PGlite (Postgres WASM).
- **Native Module Performance**: Consistent across all platforms (2.3x improvement achieved)

## 🌟 Overview

The **ECE_Core** is a sovereign memory engine that transforms your local file system into a structured, queryable knowledge graph. Unlike traditional RAG systems that rely on heavy, probabilistic vector embeddings, ECE uses a **deterministic "Tag-Walker" protocol** to navigate your data.

It runs 100% locally, protecting your privacy while enabling "Deep Context" retrieval on consumer hardware (low RAM/VRAM requirements).

### Key Features

* **🕷️ The Tag-Walker Protocol**: Replaces resource-heavy Vector Search with a lightweight, 3-phase graph traversal (Anchor → Bridge → Walk).
* **👑 Sovereign Provenance**: Implements "Trust Hierarchy." Data created by you (Sovereign) receives a 3.0x retrieval boost over external scrapes.
* **🪞 Mirror Protocol 2.0**: Projects your AI's internal graph onto your filesystem as readable Markdown files organized by `@bucket` and `#tag`.
* **👻 Ghost Data Protocol**: "Read-After-Write" verification ensures zero data loss during high-velocity ingestion.
* **⚛️ Atomic Architecture (V4)**: Chemically splits content into a taxonomy of **Compounds** (Files), **Molecules** (Sentences), and **Atoms** (Concepts), enabling "Universal Data API" granularity.

---

## 🏗️ Architecture (For LLM Developers)

### 1. The Core (Node.js/C++ Hybrid Monolith)
The engine runs as a single, efficient Node.js process with high-performance C++ native modules for critical path operations:

1.  **Ingestion (The Atomizer)**:
    * **Compounder**: Identifies the main body of content (File/Compound).
    * **Molecular Fission**: Splits content into semantic "Molecules" (Sentences) for granular retrieval.
    * **Key Assassin**: Surgically removes JSON artifacts from code (Data Hygiene) (accelerated with C++ native module).
    * **Fingerprint (Molecular Signature)**: Generates locality-sensitive hashes (SimHash) for fuzzy deduplication (C++ native module).
    * **Atomizer**: Extracts fundamental "Atoms" (Entities/Keywords) using sovereign tag lists.

**Performance Benefits**:
    * **2.3x faster** code processing compared to pure JavaScript
    * **Zero-copy string processing** using `std::string_view` to reduce memory pressure
    * **Sub-millisecond processing** for typical operations
    * **Graceful fallback** to JavaScript implementations when native modules unavailable

2.  **Enhanced Architecture Components**:
    * **Path Manager**: Centralized path resolution across all platform environments
    * **Native Module Manager**: Robust loading and fallback mechanisms for native modules
    * **Bright Node Protocol**: Selective graph illumination for reasoning models
    * **Resource Manager**: Memory optimization and monitoring system
    * **Enhanced Health Checks**: Comprehensive system monitoring and reporting

**Browser Paradigm Benefits**:
    * **Universal Compatibility**: Runs on any device from smartphones to servers
    * **Selective Loading**: Only load relevant "atoms" for current query instead of entire dataset
    * **Cross-Platform**: Consistent performance across different operating systems
    * **Local-First**: All data remains on user's device for privacy and sovereignty

2.  **Retrieval (Tag-Walker)**:
    * **Phase 1 (Anchors)**: Uses optimized FTS (Full Text Search) to find direct keyword matches (70% context budget).
    * **Phase 2 (The Walk)**: Pivots via shared tags/buckets to find "Associative Neighbors" that share context but lack keywords (30% context budget).

3.  **Persistence (PGlite)**:
    * Backed by **Postgres WASM** for universal compatibility.
    * Manages relational tables for `*atoms`, `*molecules`, and `*compounds`.

### 2. The Application Layer
* **API**: RESTful interface at `http://localhost:3000/v1/`.
* **Frontend**: Modern React + Vite dashboard with **Focused Single-Column UI** (Standard 077).
    *   **Reasoning-First**: Features the **R1 Reasoning Loop** providing transparency into AI thoughts.
    *   **Glassmorphic Aesthetic**: High-fidelity UI using `GlassPanel` and Tailwind-blended styling.
    *   **Focused Chat**: Single-column layout designed for distraction-free synthesis.
* **Desktop Overlay**: Electron "Thin Client" for Always-on-Top assistance.

### 3. R1 Reasoning Loop
The system has transitioned from a tool-using orchestrator to a high-fidelity **Reasoning Engine**. This loop ensures depth and assessment before every response:

1.  **Thought 1 (A1)**: Initial high-level analysis of the user objective.
2.  **Thought 2 (A2)**: Critical evaluation and gap identification.
3.  **Thought 3 (A3)**: Synthesis, contradiction resolution, and final assessment.
4.  **Final Answer**: Definitive response delivered to the Operator.

> [!NOTE]
> Tool-calling capabilities (Search, Read, etc.) have been archived to maximize reasoning efficacy and UI simplicity. They remain available in the codebase for future re-integration.

## 📊 Architecture Diagrams (For LLM Developers)

To help visualize the complex architecture of ECE_Core, we've created several diagrams:

### System Architecture Overview
![System Architecture](./docs/architecture_diagram.md#system-architecture-overview)

### Atomic Taxonomy: Atom -> Molecule -> Compound
![Atomic Taxonomy](./docs/architecture_diagram.md#atomic-taxonomy-atom---molecule---compound)

### Ingestion Pipeline
![Ingestion Pipeline](./docs/ingestion_pipeline_diagram.md#complete-ingestion-flow)

### Search Architecture (Tag-Walker Protocol)
![Search Architecture](./docs/search_architecture_diagram.md#overview-of-search-architecture)

### API Flow Diagrams
- [Ingestion API Flow](./docs/api_flows_diagram.md#ingestion-api-flow)
- [Search API Flow](./docs/api_flows_diagram.md#search-api-flow)
- [Chat API Flow](./docs/api_flows_diagram.md#chat-api-flow)
- [File Watch Ingestion Flow](./docs/api_flows_diagram.md#file-watch-ingestion-flow)
- [Tag-Walker Search Flow](./docs/api_flows_diagram.md#tag-walker-search-flow)
---

## 🚀 Quick Start (For LLM Developers)

### Prerequisites
* Node.js >= 18.0.0
* pnpm (`npm i -g pnpm`)
* Git

### 1. Installation
```bash
git clone https://github.com/External-Context-Engine/ECE_Core.git
cd ECE_Core
pnpm install
```

### 1.5. Platform Specific Setup
*   **Universal**: No manual binary placement required. The engine now uses **PGlite** (Postgres in WASM) for universal compatibility.
*   **Native Modules**: Automatically built via `npm run build:native`.

### 2. Configuration

The configuration is now managed through `engine/user_settings.json`. You can customize settings by editing this file:

```json
{
    "llm": {
        "model_dir": "../../models",
        "chat_model": "glm-edge-1.5b-chat.Q5_K_M.gguf",
        "task_model": "Qwen3-4B-Function-Calling-Pro.gguf",
        "gpu_layers": 11,
        "ctx_size": 8192
    },
    "dreamer": {
        "enabled": true,
        "schedule": "0 3 * * *"
    },
    "search": {
        "strategy": "hybrid",
        "hide_years_in_tags": true,
        "whitelist": [
            "burnout",
            "career",
            "decision",
            "pattern",
            "impact",
            "context",
            "memory"
        ]
    }
}
```

The system will use sensible defaults if `user_settings.json` is not present or if specific settings are missing.

### 3. Run Engine (One-Click)
Windows users can simply run the included batch script to build and launch everything:

```bash
start.bat
```

Or manually:

```bash
pnpm build
pnpm start
```

* **Server**: `http://localhost:3000`
* **Health Check**: `http://localhost:3000/health`
* **Monitoring Dashboard**: `http://localhost:3000/monitoring/dashboard`
* **Performance Metrics**: `http://localhost:3000/monitoring/metrics`
* **System Resources**: `http://localhost:3000/monitoring/resources`
* **Request Tracing**: `http://localhost:3000/monitoring/traces`

### 4. Run Desktop Overlay (Optional)

```bash
cd desktop-overlay
pnpm install
pnpm start
```

---

## 📂 Project Structure (For LLM Developers)

* **`engine/`**: The neural center.
* `src/core/`: Database (PGlite) and Batch processors.
* `src/services/ingest/`: Watchdog, AtomizerService, and Atomic Ingest.
* `src/services/search/`: The **Atomic Tag-Walker** implementation.
* `src/services/mirror/`: Filesystem projection logic.
* `src/types/`: Type definitions for LLM developer reference.
* `src/utils/`: Utility functions and managers.

* **`frontend/`**: React dashboard.
* **`desktop-overlay/`**: Electron app.
* **`specs/`**: The **Sovereign Engineering Code (SEC)** - The laws governing this system.

---

## 📚 Documentation Standards (Per doc_policy.md)

This project follows strict engineering standards documented in `specs/standards/`. Key references:

* **Standard 065**: [Graph-Based Associative Retrieval](./specs/standards/065-graph-associative-retrieval.md)
* **Standard 059**: [Reliable Ingestion (Ghost Data Protocol)](./specs/standards/059_reliable_ingestion.md)
* **Standard 058**: [UniversalRAG API](./specs/standards/058_universal_rag_api.md)
* **Standard 073**: [Data Hygiene Protocol (The Immune System)](./specs/standards/073-data-hygiene-protocol.md)

### Core Documentation Principles:
1. **Code is King**: Code is the only source of truth. Documentation is a map, not the territory.
2. **Synchronous Testing**: EVERY feature or data change MUST include a matching update to the Test Suite.
3. **Visuals over Text**: Prefer Mermaid diagrams to paragraphs.
4. **Brevity**: Text sections must be <500 characters.
5. **Pain into Patterns**: Every major bug must become a Standard.
6. **LLM-First Documentation**: Documentation must be structured for LLM consumption and automated processing.
7. **Change Capture**: All significant system improvements and fixes must be documented in new Standard files.
8. **Modular Architecture**: Each component must be documented in isolation for LLM comprehension.
9. **API-First Design**: All interfaces must be clearly defined with examples.
10. **Self-Documenting Code**: Complex logic must include inline documentation explaining intent.

---

## 🧰 Utility Tools (For LLM Developers)

### Codebase Scraper (`read_all.js`)
**The Official Ingestion Bridge**

Consolidate an entire project into a digestable corpus for the engine.

```bash
node read_all.js <path_to_project_root>
```

**Output**: `codebase/combined_context.yaml`
**Usage**: Drop the result into `notebook/inbox`.
**Mechanism**: The Refiner detects this YAML format and performs **Virtual Atomization**:
*   Decomposes the YAML back into virtual files (e.g., `src/index.ts`).
*   **Hygiene Check**: Filters binaries and circular logs.
*   Auto-tags them with `#code`, `#doc`, and `#project:{name}`.
*   Enables precise filtering (Code vs. Docs) even for massive codebases.

## 🛡️ Data Hygiene & Tagging (Standard 073)

The engine implements a rigorous "Immune System" to ensure your context remains clean and high-signal.

### 1. The Dual Inboxes (Provenance)
*   **`notebook/inbox/`**: For **Sovereign Data** (Your notes, code, thoughts).
    *   **Trust Score**: High (2.0x - 3.0x Boost).
    *   **Use Case**: Manual drops, Obsidian vault sync.
*   **`notebook/external-inbox/`**: For **External Data** (Web scrapes, news, documentation).
    *   **Trust Score**: Low (supporting evidence only).
    *   **Use Case**: News Agent outputs, documentation dumps.

### 2. Sovereign Tags (`context/sovereign_tags.json`)
You can define specific keywords that should ALWAYS trigger a tag, regardless of context.
*   **Config**: Edit `context/sovereign_tags.json`.
*   **Behavior**: If the Refiner sees the word "Sybil" in an atom, it stamps it with `#Sybil`.
*   **Benefit**: Ensures your core terminology is always indexed for retrieval.

### 3. Automatic Project Tagging
The engine reads your file paths to generate context.
*   Path: `notebook/inbox/Job-Context/Resume.md`
*   Resulting Tags: `#project:Job-Context`, `#inbox`, `#Sovereign`
*   **Tip**: Organize your files into named folders to automatically categorize them.

### 4. The Refiner's "Key Assassin"
The engine automatically strips:
*   JSON Metadata wrappers (`"response_content": "..."`)
*   Excessive backslashes (`C:\\\\Users` -> `C:/Users`)
*   "Thinking" logs from LLM outputs.
*   **Result**: You can dump raw logs into the inbox, and the engine will distill the actual content.

---

## 🧠 Querying Best Practices (For LLM Developers)

The **Tag-Walker** engine interprets intents differently than vector databases. Use these patterns for optimal results:

### 1. Concept Recall (The Net)
*   **Pattern**: Single Keyword / Concept
*   **Example**: `"Memory"` or `"WebGPU"`
*   **Mechanism**: Triggers **Tag-Walker**. The engine treats the query as a conceptual node and "walks" the graph to find everything related to it, even if the exact word isn't present in the target.
*   **Use Case**: "Tell me everything about X."

### 2. Precision Intersection (The Laser)
*   **Pattern**: Multi-Keyword Constraint
*   **Example**: `"WebGPU buffer mapping"`
*   **Mechanism**: Triggers **FTS Intersection**. The engine demands that *all* terms (or highly correlated concepts) be present. It filters out broad associations to give you the specific implementation details.
*   **Use Case**: "How do I implement X?" or "Find the specific error log."

### 3. Natural Language (The Conversation)
*   **Pattern**: Questions or Sentences
*   **Example**: `"How is Coda doing today?"`
*   **Mechanism**: Uses **Wink-NLP** to extract the core intent (`Coda` + `Status`). It strips stop words ("How", "is", "doing") and executes a graph query on the entities.
*   **Use Case**: Chatting with the system or asking about high-level status.

---

## LLM Developer Quick Reference

### Common API Endpoints
*   `POST /v1/ingest` - Content ingestion with atomic processing
*   `POST /v1/memory/search` - Tag-Walker semantic search
*   `GET /health` - System health and component status
*   `GET /monitoring/metrics` - Performance metrics and system resources
*   `GET /v1/models` - Available LLM models and capabilities

### Key Data Structures
*   **Compound**: Document-level entity with full content and metadata
*   **Molecule**: Semantic segment with byte coordinates and relationship data
*   **Atom**: Atomic semantic unit with entity recognition and tagging
*   **Tag-Walker**: Graph traversal protocol for associative retrieval
*   **SimHash**: Fingerprinting algorithm for deduplication

### Native Module Functions
*   `fingerprint(content)` - Generate SimHash for content
*   `atomize(content, strategy)` - Split content into semantic molecules
*   `cleanse(content)` - Remove artifacts and normalize content
*   `distance(hash1, hash2)` - Compute similarity between fingerprints

---

## License

Elastic License 2.0. Copyright (c) 2026 External Context Engine. See [LICENSE](LICENSE) for full terms.
