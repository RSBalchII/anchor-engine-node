# Quick Start Guide

## Prerequisites

- Node.js >= 18.0.0
- pnpm package manager
- Git
- Available port 3000 (default)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/External-Context-Engine/ECE_Core.git
cd ECE_Core
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up configuration:
```bash
# Copy and edit the configuration file
cp sovereign.yaml.example sovereign.yaml
# Edit sovereign.yaml with your configuration
```

4. Ensure you have models in the `models/` directory (GGUF format)

5. Start the engine:
```bash
pnpm start
```

## Basic Usage

Once started, the engine will be available at `http://localhost:3000`.

### API Endpoints
- Health check: `GET /health`
- Chat completions: `POST /v1/chat/completions` (OpenAI format)
- Memory search: `POST /v1/memory/search` (Tag-Walker Protocol)
- Ingest content: `POST /v1/ingest`
- List buckets: `GET /v1/buckets`
- Backup database: `GET /v1/backup`

### Semantic Brain Mirroring
The system projects its inner database into the `mirrored_brain/` directory using an `@bucket/#tag` structure. This allows you to browse and manage the AI's "thoughts" directly through your filesystem.

### File-Based Ingestion
The system automatically watches the `inbox/` and `context/` directories for new files. 

## Configuration

The system is configured via `sovereign.yaml` which includes:
- Model paths and settings
- Network configuration (ports)
- Memory and storage settings
- Dreamer service intervals

## Development

For development mode:
```bash
npm run dev
```

## Building

To build the executable:
```bash
npm run build
```

## Services

The engine includes several background services:
- **Dreamer**: Self-organizing memory categorization and auto-tagging.
- **Mirror 2.0**: Generates the `mirrored_brain` filesystem projection (@bucket/#tag).
- **Tag-Walker**: High-speed graph-based associative retrieval engine.
- **Scribe**: Manages session state for conversation coherence