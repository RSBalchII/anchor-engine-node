# Sovereign Context Engine (ECE) - Core System

**Version:** 3.0.0 | **Status:** Active | **Domain:** Autonomous Context Management

## Overview

The Sovereign Context Engine (ECE) is a self-hosted, privacy-focused knowledge management system that creates a persistent memory layer for AI-assisted workflows. Built with a "LLM-First" architecture, it enables sovereign control of personal and organizational knowledge graphs.

## Key Features

- **Autonomous Context Management**: Self-organizing memory with temporal awareness
- **Multi-Modal Ingestion**: Supports text, code, documents, and structured data
- **Semantic Search**: Advanced retrieval using graph-based associative search
- **Privacy-First**: All data remains under your control, no cloud dependencies
- **Extensible Architecture**: Plugin system for custom integrations
- **Cross-Platform**: Runs on Windows, macOS, and Linux

## Architecture Highlights

### Core Components
- **Engine**: Headless context engine with REST API
- **Desktop Overlay**: Electron-based UI wrapper
- **Frontend**: Modern web interface (React/Vanilla)
- **Database**: PGlite-powered graph-relational store

### Data Model
- **Atomic Architecture**: Compound → Molecule → Atom hierarchy
- **Semantic Indexing**: Tag-Walker protocol for associative retrieval
- **Temporal Folding**: Chronological organization with versioning
- **Relationship Mapping**: Entity co-occurrence and connection discovery

## Installation

### Prerequisites
- Node.js v18+ 
- PNPM package manager
- Git for version control

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd ECE_Core

# Install dependencies
pnpm install

# Build the system
pnpm build

# Launch the system
./start.sh        # Linux/macOS
.\start.bat      # Windows
```

## Usage

### Quick Start
1. Run `./start.sh` (Linux/macOS) or `.\start.bat` (Windows)
2. Access the UI at http://localhost:3000
3. Begin ingesting content via drag-and-drop or API
4. Search and explore your knowledge graph

### Data Ingestion
- **File Drop**: Place files in the `context/` directory
- **API Ingestion**: Use `POST /v1/ingest` endpoint
- **Batch Import**: Use corpus format for bulk ingestion
- **Real-time Sync**: Watchdog monitors `context/` directory

### Search Capabilities
- **Natural Language**: Ask questions in plain English
- **Tag-Based**: Use hashtags for precise filtering
- **Temporal**: Filter by date ranges and time periods
- **Semantic**: Retrieve related concepts and associations

## System Architecture

### Technology Stack
- **Backend**: Node.js with Express.js
- **Database**: PGlite (PostgreSQL-compatible)
- **Frontend**: TypeScript, React (Vite build system)
- **Desktop**: Electron wrapper
- **AI Integration**: Local LLM support with remote fallback

### Standards Implemented
- **Standard 053**: CozoDB Pain Points & OS Compatibility
- **Standard 059**: Reliable Ingestion Pipeline
- **Standard 068**: Tag Infection Protocol
- **Standard 074**: Native Module Acceleration
- **Standard 081**: Atomic Taxonomy
- **Standard 088**: Server Startup Sequence (ECONNREFUSED fix)

## Troubleshooting

### Common Issues
- **ECONNREFUSED**: Fixed in Standard 088 - server starts before database initialization
- **Slow Startup**: First run includes database initialization (subsequent runs are faster)
- **UI Access**: Direct access at http://localhost:3000 if Electron wrapper is delayed

### Health Checks
- System status: `GET /health`
- Component status: `GET /health/{component}`
- Performance metrics: `GET /monitoring/metrics`

## Contributing

We welcome contributions! Please see our contributing guidelines in the documentation.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- Documentation: Check the `/docs/` directory
- Issues: Report bugs and feature requests on GitHub
- Community: Join our discussion forums

## Roadmap

- Enhanced AI reasoning capabilities
- Improved collaboration features
- Mobile application support
- Advanced visualization tools
- Plugin marketplace