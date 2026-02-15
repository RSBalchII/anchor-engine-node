# Anchor

**Version:** 3.0.0 | **Status:** Active | **Domain:** Autonomous Context Management

> **"Anchor Your System's Reality."**

## Overview

**Anchor** is a self-hosted, privacy-focused knowledge management system that creates a persistent memory layer for AI-assisted workflows. Built with a "LLM-First" architecture, it enables sovereign control of personal and organizational knowledge graphs.

Anchor is fundamentally a **data atomization service** that packages data in ways that allow multiple data types to be semantically utilized. The system can be queried and parsed through the Anchor CLI into tables, CSV, or JSON structures for use by various agent harnesses.

## System State: "HYBRID POWERPLANT ONLINE"

The ECE_Core system has successfully achieved **orbital velocity** with the deployment of the **Hybrid C++/Node.js Architecture**. The "Iron Lung" (Native Module Acceleration) is operational with exceptional performance metrics.

### Performance Achievements

- **Distance Calculations**: 4.7M ops/sec (Batch/SIMD) - 8,000x improvement
- **Ingestion Pipeline**: Full pipeline (Cleanse → Fingerprint) at ~9ms
- **Memory Efficiency**: 30-50% reduction in memory usage
- **Cross-Platform**: Consistent performance across Windows, macOS, Linux
- **Native Acceleration**: 2.3x faster code processing with C++ modules
- **Tag-Walker Protocol**: Graph-based associative retrieval replacing vector search (70/30 keyword/associative split).
- **Ingestion Resilience**: O(1) memory usage via atomic deduplication and sub-batching.
- **Database Stability**: PGlite implementation successfully debugged and stable (Replacing CozoDB)

## Key Features

- **Autonomous Context Management**: Self-organizing memory with temporal awareness
- **Multi-Modal Ingestion**: Supports text, code, documents, and structured data
- **Semantic Search**: Advanced retrieval using graph-based associative search
- **Privacy-First**: All data remains under your control, no cloud dependencies
- **Extensible Architecture**: Plugin system for custom integrations
- **Cross-Platform**: Runs on Windows, macOS, and Linux
- **Agent Harness Agnostic**: Designed to work with multiple agent frameworks

## Architecture Highlights

### Core Components
- **anchor-engine**: Knowledge database engine (runs on port 3160)
- **Desktop Overlay**: Electron-based UI wrapper
- **Frontend**: Modern web interface (React/Vanilla)
- **Database**: PGlite-powered graph-relational store

### Data Model
- **Atomic Architecture**: Compound → Molecule → Atom hierarchy
- **Semantic Indexing**: Tag-Walker protocol for associative retrieval
- **Temporal Folding**: Chronological organization with versioning
- **Relationship Mapping**: Entity co-occurrence and connection discovery

## Agent Harness Integration

### Harness Agnosticism Goal
Anchor is designed to be **agent harness agnostic**, meaning it can work with multiple agent frameworks and systems. While **OpenCLAW** is the primary harness we intend to use, the system is architected to support:

- OpenCLAW (primary target)
- Other custom agent frameworks
- Third-party agent systems
- Direct API integrations

### Data Atomization Service
Anchor's core function is as a **data atomization service** that:

- Packages diverse data types into semantically meaningful units
- Enables semantic utilization of multiple data types
- Provides CLI access for querying and parsing data
- Outputs data in standardized formats (tables, CSV, JSON)
- Serves as a foundational layer for various agent systems

The system can be queried through the Anchor CLI to parse data into structured formats that can be consumed by any agent harness.

## Updated Architecture Notes

**Important**: The previously planned "Bright Node Protocol" and "Three Column UI" have been reverted to a simpler glass panel design for improved stability and maintainability. The UI now uses a consistent glass panel aesthetic throughout.

The chat interface serves as a prototype for agent harness integration. The current chat system demonstrates how an external system can connect to Anchor to retrieve context and use it in AI interactions.

The system implements a "stateless" approach where:
1. Agent harness sends query to ECE
2. Query is intercepted and processed by the search system
3. Retrieved context (limited to configurable tokens) is returned
4. Agent harness combines context with its own logic
5. Final processing happens in the agent system

**Data Flow:**
```
Agent Query -> Anchor Context Retrieval -> Context + Agent Logic -> Response
```

## Search Logic & Current Challenges

### Search Calibration (Priority 1)
- **Status**: Transitioning from "Bright Node" complex UI to streamlined search.
- **Issue**: Natural language query optimization still in progress.
- **Goal**: Perfecting the stateless context injection for the OpenClaw prototype.

### Guidance System Lag
- The engine (performance) is hyper-scaled but search guidance needs calibration
- System behaves like "Ferrari with stick-shift stuck in neutral"
- Semantic Shift Architecture (Standard 084) requires tuning for natural language

### Specific Challenge: Query Intent Mapping
The Tag-Walker protocol shows brittleness in natural language query processing:
- Query "What is the latest state of the ECE" returned 0 results
- Fallback query "state ECE" returned 42 relevant results
- NLP parser over-optimizes or filters are too strict
- System relies on fallback strategies instead of primary semantic matching

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
2. Access the UI at the configured server URL (default: http://localhost:3160, configurable in user_settings.json)
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

## Standalone Operation

The Anchor Engine can operate independently with a built-in lightweight UI. When running standalone:
- The engine serves a simple React-based UI from its own `public` directory
- When integrated with the full system, it uses the external UI from `packages/anchor-ui/dist`
- The system intelligently detects which UI to serve based on availability

## System Architecture

### Technology Stack
- **Backend**: Node.js with Express.js
- **Database**: PGlite (PostgreSQL-compatible)
- **Frontend**: TypeScript, React (Vite build system) with lightweight fallback UI
- **Desktop**: Electron wrapper
- **AI Integration**: Local LLM support with remote fallback

### Standards Implemented
- **Standard 053**: CozoDB Pain Points & OS Compatibility
- **Standard 059**: Reliable Ingestion Pipeline
- **Standard 088**: Server Startup Sequence (ECONNREFUSED fix)
- **Standard 094**: Smart Search Protocol (Fuzzy Fallback & GIN Optimization)

### Search Capabilities
- **Natural Language**: Ask questions in plain English with "Smart Search" intent detection
- **Elastic Context**: Dynamically scales context (200b - 32kb) based on term rarity (Standard 105)
- **Typo Tolerance**: Fuzzy search logic catches misspellings (e.g. "conciousness" -> "consciousness")
- **Dynamic Sorting**: Use keywords like "earliest" or "oldest" to toggle chronological sorting
- **Tag-Based**: Use hashtags for precise filtering
- **Temporal**: Filter by date ranges and time periods
- **Semantic**: Retrieve related concepts and associations via Tag-Walker
### Common Issues
- **ECONNREFUSED**: Fixed in Standard 088 - server starts before database initialization
- **Slow Startup**: First run includes database initialization (subsequent runs are faster)
- **UI Access**: Direct access at the configured server URL (default: http://localhost:3160, configurable in user_settings.json) if Electron wrapper is delayed
- **Database Type Errors**: Fixed "Invalid input for string type" errors during ingestion pipeline - see Standard 059 for details

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