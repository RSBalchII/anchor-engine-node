# Anchor API Reference

## Overview

The Anchor system provides a comprehensive API for interacting with the context engine. All endpoints follow the UniversalRAG standard and are accessible under the `/v1/` prefix.

## Authentication

Currently, the API does not require authentication and is intended for local use only. All endpoints are accessible without API keys or tokens.

## Core Endpoints

### Memory Search
- **POST** `/v1/memory/search` - Perform search using Tag-Walker protocol with 70/30 keyword/associative split
- **POST** `/v1/memory/molecule-search` - Split query into sentence-like chunks and search each separately
- **GET** `/v1/buckets` - Get all available data buckets
- **GET** `/v1/tags` - Get all available tags (optionally filtered by buckets)

### Content Management
- **POST** `/v1/ingest` - Ingest new content into the system
- **POST** `/v1/atoms/:id/quarantine` - Quarantine a specific atom by ID
- **POST** `/v1/atoms/:id/restore` - Restore a quarantined atom by ID
- **PUT** `/v1/atoms/:id/content` - Update the content of an atom

### System Management
- **GET** `/health` - Get system health status
- **POST** `/v1/backup` - Create a backup of the database
- **GET** `/v1/backups` - List available backups
- **POST** `/v1/backup/restore` - Restore from a specific backup
- **POST** `/v1/dream` - Trigger the dreamer service for background processing

### Agent Integration
- **POST** `/v1/chat/completions` - Chat completions endpoint with context injection
- **GET** `/v1/models` - List available models
- **POST** `/v1/inference/load` - Load a specific model

### Research & Tools
- **POST** `/v1/research/scrape` - Scrape and process web content
- **GET** `/v1/research/web-search` - Perform web search
- **POST** `/v1/terminal/exec` - Execute terminal commands (simulated)
- **POST** `/v1/debug/sql` - Execute raw SQL queries (admin only)

### Graph & Visualization
- **POST** `/v1/graph/data` - Get graph data for visualization
- **GET** `/v1/scribe/state` - Get scribe state
- **DELETE** `/v1/scribe/state` - Clear scribe state

### System Configuration
- **GET** `/v1/system/config` - Get system configuration

## Request/Response Format

### Search Request
```json
{
  "query": "search query text",
  "buckets": ["bucket1", "bucket2"],
  "tags": ["tag1", "tag2"],
  "max_chars": 20000,
  "provenance": "all"
}
```

### Search Response
```json
{
  "status": "success",
  "context": "retrieved context string",
  "results": [
    {
      "id": "atom_id",
      "content": "content text",
      "source": "source path",
      "timestamp": 1234567890,
      "buckets": ["bucket1"],
      "tags": ["tag1"],
      "epochs": "epoch_info",
      "provenance": "internal",
      "score": 0.95
    }
  ],
  "metadata": {
    "engram_hits": 0,
    "tag_walker_latency": 0,
    "provenance_boost_active": true
  }
}
```

## Error Handling

All API endpoints return appropriate HTTP status codes:
- `200` - Success
- `400` - Bad request (invalid parameters)
- `404` - Resource not found
- `500` - Internal server error
- `503` - Service temporarily unavailable (during initialization)

Error responses include a JSON object with an `error` field describing the issue.

## Performance Considerations

- Search endpoints accept a `max_chars` parameter to limit response size
- Token budgets can be adjusted based on use case requirements
- The system implements caching for frequently accessed content
- Background processing occurs asynchronously to avoid blocking requests