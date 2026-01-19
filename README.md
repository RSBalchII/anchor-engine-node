# ECE_Core - Sovereign Context Engine

> **Executive Cognitive Enhancement (ECE)** - Personal external memory system as an assistive cognitive tool.

**Status**: Active development | **Architecture**: UniversalRAG (Node.js + WebGPU + RocksDB)

---

## 🌟 Overview

The ECE_Core is a modern **UniversalRAG** engine that transforms your local file system into a queriable, sovereign AI memory. It runs locally, ensuring 100% privacy, and uses a **Dual-Worker** architecture to handle chat and ingestion simultaneously without lag.

### Key Features
- **Sovereign Provenance**: Your files are "Tier 1" knowledge. The system boosts them 2x over generic data.
- **Dual-Worker System**: Dedicated workers for **Chat** (e.g., Qwen) and **Embeddings** (e.g., Gemma).
- **Universal Ingestion**: Just drop files into the `Inbox` or `Notebook`. Text, code, and markdown are chemically "atomized" into vector memories.
- **Thinking Context**: Uses a "Rolling Context" window that prioritizes relevant facts + recent history.
- **Desktop Overlay**: A thin, transparent "Heads Up Display" for instant access to your specialized AI.

---

## 🏗️ Architecture

### 1. Ingestion Pipeline ("The Refiner")
- **Atomization**: Splits content into semantic "Atoms" (thoughts) rather than arbitrary chunks.
- **Sanitization**: Strips null bytes, corrects encoding, and handles standard file types.
- **Embedding**: Uses a dedicated 300M+ parameter model (separate from Chat) to vectorize atoms.
- **Storage**: Persists to **CozoDB** (RocksDB backend) + **HNSW** Vector Index.

### 2. Cognitive Services
- **ChatWorker**: Specialized worker for high-speed inference (supports streaming).
- **EmbeddingWorker**: Dedicated worker for vector generation.
- **ContextManager**: Middle-out context composer with:
    - **Dynamic Recency**: Adapts sort order based on temporal queries ("latest logs" vs "history").
    - **Safety Buffer**: Targets 3800 tokens to prevent overflow.
    - **Smart Slicing**: Truncates content at punctuation boundaries.

### 3. Application Layer
- **API**: RESTful interface at `http://localhost:3000/v1/`.
- **Frontend**: Modern React + Vite dashbaord.
- **Desktop Overlay**: Lightweight Electron shell for "Always-on-Top" assistance.

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- pnpm package manager (`npm i -g pnpm`)
- Git

### 1. Installation
```bash
git clone https://github.com/External-Context-Engine/ECE_Core.git
cd ECE_Core
pnpm install
```

### 2. Configuration (`.env`)
The system uses a single `.env` file. A sample is provided.
```bash
# Core
PORT=3000
API_KEY=ece-secret-key

# Models (Absolute Paths or specific filenames in 'engine/models')
LLM_MODEL_PATH=Qwen3-4B-Instruct.gguf
LLM_EMBEDDING_MODEL_PATH=embeddinggemma-300m.gguf

# Hardware
LLM_GPU_LAYERS=33
LLM_CTX_SIZE=4096
LLM_EMBEDDING_CTX_SIZE=8192

# Vision (Required for image processing)
VISION_MODEL_PATH=C:/path/to/Qwen2-VL-2B-Instruct.gguf
VISION_PROJECTOR_PATH=C:/path/to/mmproj-Qwen2-VL.gguf
```

### 3. Run Engine
```bash
pnpm start
```
*   Server: `http://localhost:3000`
*   Health: `http://localhost:3000/health`

### 4. Run Desktop Overlay (Optional)
```bash
cd desktop-overlay
pnpm install
pnpm start
```

---

## 📂 Project Structure

- **engine/**: The core logic (Node.js, Express, Llama.cpp).
    - `src/core/inference/`: Chat & Embedding Workers.
    - `src/services/ingest/`: Refiner & Atomizer.
    - `src/services/search/`: Vector Search & Routing.
- **frontend/**: React + Vite web dashboard.
- **desktop-overlay/**: Electron "Thin Client".
- **archive/**: Deprecated code.

---

## 🛠️ Development

### Build
```bash
# Builds Engine, Frontend, and Types
npm run build
```

### Test
```bash
npm test
```

---

## 📚 Documentation Standards

- **`specs/doc_policy.md`**: Documentation standards.
- **`specs/spec.md`**: Technical specification.
- **`specs/plan.md`**: Roadmap.
- **`specs/tasks.md`**: Current task list.

---

## 🧰 Utility Tools

### Codebase Scraper (`read_all.js`)
Use this tool to consolidate an entire project into a digestable format for the engine.
```bash
node read_all.js <path_to_project_root>
```
**Output:** `combined_memory.yaml`
**Usage:** Drop the resulting file into your `notebook/inbox` folder to ingest the entire codebase as a single knowledge source.

---

## Acknowledgments
**"Your data, sovereign. Your tools, open. Your mind, augmented."**