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
- Chat completions: `POST /v1/chat/completions`
- Memory search: `POST /v1/memory/search`
- Ingest content: `POST /v1/ingest`
- List buckets: `GET /v1/buckets`
- Backup database: `GET /v1/backup`

### File-Based Context
The system automatically watches the `context/` directory for new files and ingests them. Supported formats include:
- `.txt`, `.md`, `.json`, `.yaml`, `.yml`
- `.js`, `.ts`, `.py`, `.html`, `.css`
- And many other text-based formats

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
- **Dreamer**: Self-organizing memory categorization (runs automatically)
- **Mirror Protocol**: Creates physical copies of the AI brain
- **File Watcher**: Monitors `context/` directory for changes
- **Scribe**: Manages session state for conversation coherence