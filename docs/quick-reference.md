# ECE_Core Quick Reference

## Core Concepts
- **Tag-Walker Protocol**: Graph-based search replacing vector search
- **Atomic Architecture**: Compounds → Molecules → Atoms (V4 taxonomy)
- **Sovereign Context**: Local-first, privacy-preserving memory engine
- **Relationship Discovery**: Entity co-occurrence for relationship mapping

## Key Endpoints
```
POST /v1/ingest          # Ingest content
POST /v1/memory/search   # Semantic search
GET  /health             # System health
GET  /monitoring/metrics # Performance metrics
GET  /monitoring/dashboard # Real-time monitoring
```

## Performance Features
- Native C++ acceleration for critical operations
- SimHash for deduplication
- Graph-based retrieval (no vector embeddings)
- CozoDB (RocksDB) for unified storage

## Configuration
- Settings in `user_settings.json`
- Model paths and parameters
- Performance tuning options
- Ingestion settings

## Monitoring
- Real-time dashboard access
- Performance metrics tracking
- Health check endpoints
- Request tracing capabilities

## Best Practices
- Use semantic buckets for organization
- Apply meaningful tags for retrieval
- Monitor ingestion performance
- Leverage relationship discovery for insights