# External Context Engine (ECE) - Sovereign Context Protocol

> **The Browser Paradigm for AI Memory**: Just as web browsers allow any device to access the internet by loading only needed content, ECE allows any device to process massive AI context by retrieving only relevant "atoms" for current thought.

## 🚀 Quick Start

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

**Important**: Due to the hybrid architecture, you need to place the CozoDB binary for your OS in the engine root:

1. Locate the CozoDB binary after installation: `node_modules/.pnpm/cozo-node@*/native/`
2. Copy the appropriate binary to the `engine/` folder:
   - **Windows**: `engine/cozo_node_win32.node`
   - **macOS**: `engine/cozo_node_darwin.node` 
   - **Linux**: `engine/cozo_node_linux.node`

### Running the Engine

```bash
# Start the engine
pnpm start

# Health check
curl http://localhost:3000/health
```

## 🌐 The Browser Paradigm

ECE implements a revolutionary approach to AI memory systems inspired by web browsers:

### Traditional Approach (Monolithic Centralization)
- Load entire vector index into memory
- Requires high-spec servers with lots of RAM
- Proprietary "Black Box" systems
- Vendor lock-in and privacy concerns

### ECE Approach (Browser Paradigm)
- **Selective Loading**: Only load relevant "atoms" for current query
- **Universal Compatibility**: Runs on any device (smartphone to server)
- **Open Architecture**: Sovereign, local-first design
- **Privacy Preserving**: All data stays on your device

## 🔧 Architecture Overview

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

### Key Components

1. **Node.js Shell**: Handles networking, OS integration, and orchestration
2. **N-API Boundary**: Stable interface between JavaScript and C++
3. **C++ Performance Layer**: Critical operations for speed and efficiency

## 🎯 Core Features

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

## 📖 Usage Examples

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

## 🏗️ Development

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

This project is licensed under the Elastic License 2.0. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the universal accessibility of web browsers
- Built with the power of Node.js and C++ N-API
- Designed for cognitive sovereignty and privacy

---

*Part of the Sovereign Context Protocol initiative to democratize AI memory systems.*