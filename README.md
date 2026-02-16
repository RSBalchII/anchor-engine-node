# Anchor Engine (Memory)

**Version:** 3.0.0 | **Role:** Semantic Memory & Search API

The **Anchor Engine** is the backend service responsible for **ingesting**, **indexing**, and **retrieving** your personal data. It runs as a local API server (default port: `3160`) that other components (like `anchor-ui` or `nanobot-node`) query to retrieve context.

## Core Responsibilities

1.  **Ingestion ("The Atomizer")**:
    -   Watches the `context/` directory for new files.
    -   Parses PDFs, Markdown, Code, and Text.
    -   Splits content into atomic units ("Atoms") for granular retrieval.
    -   Fingerprints content to prevent duplicates (SimHash).

2.  **Indexing**:
    -   Stores data in a local **PGlite** (PostgreSQL-compatible) database.
    -   Enables full-text search, vector operations, and graph queries.

3.  **Search API**:
    -   Provides a high-speed search endpoint (`/api/search`) for agents.
    -   Uses **Tag-Walker Protocol** to find semantically related context.

## API Usage

The Engine exposes a REST API for interacting with the knowledge graph.

### Search
`GET /api/search?q=your+query`
-   Returns a JSON list of relevant "Atoms" (paragraphs/code blocks).
-   Used by `anchor-ui` to inject memory into the LLM context.

### Ingest
`POST /api/ingest`
-   Upload text or files programmatically.

### System
`GET /health`
-   Service status check.

## Data Model: "Atoms"

Anchor treats all data as "Atoms". An Atom is the smallest unit of meaning (e.g., a paragraph, a function, a chat message).
-   **Compound**: A file or document.
-   **Molecule**: A section or chapter.
-   **Atom**: The actual content block.

This hierarchy allows the AI to retrieve *specific* details without reading entire documents.

## Installation

### Prerequisites
- Node.js v18+
- PNPM package manager

### Quick Start
```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Start Engine
pnpm start
```

## Configuration
The engine uses `user_settings.json` in the root directory for configuration (ports, paths, models).

## Standards Implemented
- **Standard 053**: CozoDB Pain Points & OS Compatibility
- **Standard 059**: Reliable Ingestion Pipeline
- **Standard 088**: Server Startup Sequence (ECONNREFUSED fix)
- **Standard 094**: Smart Search Protocol (Fuzzy Fallback & GIN Optimization)

## Health Checks
- System status: `GET /health`
- Component status: `GET /health/{component}`
- Performance metrics: `GET /monitoring/metrics`
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

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** - see the [LICENSE](LICENSE) file for details.

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