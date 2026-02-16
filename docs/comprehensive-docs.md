# ECE_Core Documentation Update

## Overview
This document provides a concise yet comprehensive overview of the ECE_Core system's architecture, key features, and usage patterns. It's designed for both human readers and AI models to quickly understand the system's capabilities.

## Architecture

### Core Components
- **Sovereign Context Engine (ECE)**: Headless, local-first context engine
- **Tag-Walker Protocol**: Graph-based associative retrieval replacing vector search
- **Atomic Architecture (V4)**: Content stored as Compounds (Files) → Molecules (Sentences) → Atoms (Concepts)
- **CozoDB**: Graph-relational-vector-fts engine for unified data access

### Key Features
- **Stateless Context Protocol**: Each query gets fresh context from ECE search results
- **Relationship Narrative Discovery**: Entity co-occurrence detection for relationship patterns
- **Semantic Category Emergence**: High-level semantic categories instead of granular tags
- **Native Module Acceleration**: C++ modules for performance-critical operations

## API Endpoints

### Core Endpoints
- `POST /v1/ingest`: Ingest content into the knowledge graph
- `POST /v1/memory/search`: Search memory with semantic capabilities
- `GET /health`: System health check
- `GET /monitoring/metrics`: Performance metrics
- `GET /monitoring/dashboard`: Real-time system monitoring

### Search Capabilities
- **Tag-Walker Protocol**: Graph traversal via Unified Field Equation (Co-occurrence × Time × SimHash)
- **Semantic Search**: Relationship and narrative discovery
- **Context Assembly**: Dynamic inflation of molecular coordinates
- **Provenance Boosting**: Sovereign content receives 3.0x retrieval boost

## Performance & Monitoring

### Key Metrics
- **Ingestion Rate**: Documents processed per second
- **Search Response Time**: Query response time (target <200ms)
- **Memory Usage**: RAM consumption during operations
- **Native Module Performance**: Acceleration over pure JavaScript

### Monitoring Dashboard
- Real-time system health visualization
- Performance metrics tracking
- Resource utilization monitoring
- Request tracing and diagnostics

## Native Modules

### Performance Acceleration
- **Atomizer**: C++ text splitting for performance
- **Sanitizer**: Key Assassin protocol for content cleaning
- **Fingerprinter**: SimHash for deduplication
- **Native Module Manager**: Automatic fallback to JavaScript implementations

### Error Handling
- Graceful degradation when native modules unavailable
- Fallback to JavaScript implementations
- Comprehensive error reporting and diagnostics

## Data Model

### Atomic Taxonomy
- **Compounds**: Complete documents/files with full content
- **Molecules**: Semantic segments (sentences) with byte coordinates
- **Atoms**: Fundamental semantic units (entities, concepts)

### Tag-Walker Protocol
- **Phase 1**: FTS for direct keyword matches (70% budget)
- **Phase 2**: Graph traversal for related content (30% budget)
- **Provenance Boosting**: Sovereign content prioritization

## Configuration

### Environment Variables
- `ECE_URL`: Base URL for the engine
- `NOTEBOOK_DIR`: Directory for notebook files
- `MODEL_PATH`: Path to LLM models
- `CONTEXT_SIZE`: LLM context window size

### Settings
- Located in `user_settings.json`
- Configurable model paths and parameters
- Adjustable performance parameters
- Customizable ingestion settings

## Best Practices

### Ingestion
- Use semantic buckets for organization
- Apply meaningful tags for retrieval
- Leverage automatic entity detection
- Monitor ingestion performance metrics

### Search
- Use relationship queries for entity co-occurrence
- Leverage semantic categories for broad searches
- Monitor search performance metrics
- Use provenance filtering for specific content types

### Performance
- Monitor native module performance
- Track memory usage patterns
- Use performance regression tests
- Implement caching for repeated operations

## Troubleshooting

### Common Issues
- **Native Module Loading**: Ensure proper binary placement
- **Database Connection**: Verify CozoDB installation
- **Memory Issues**: Monitor ingestion batch sizes
- **Performance**: Check native module acceleration

### Diagnostic Tools
- Health check endpoints
- Performance monitoring dashboard
- Request tracing system
- Log analysis utilities

## Standards Compliance

### Implemented Standards
- **Standard 078**: Process Isolation & Live Diagnostics
- **Standard 084**: Semantic Shift Architecture
- **Standard 085**: Context Inflation Protocol
- **Standard 081**: Atomic Taxonomy (Atom → Molecule → Compound)

## Development

### Adding New Features
- Follow atomic architecture patterns
- Implement performance monitoring
- Add diagnostic capabilities
- Ensure graceful degradation

### Testing
- Use centralized test framework
- Implement performance regression tests
- Add diagnostic test cases
- Verify native module fallbacks

## Security & Privacy

### Local-First Architecture
- All data stored locally
- No external data transmission
- Sovereign data ownership
- Encrypted storage options

### Access Controls
- Local API endpoints only
- No external access by default
- Configurable authentication
- Audit logging capabilities