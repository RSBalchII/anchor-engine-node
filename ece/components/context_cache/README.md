# Context Cache Component

This component implements the high-speed, short-term memory layer of the ECE using Redis Stack.

## Overview

The Context Cache is a passive component managed by the `Orchestrator` agent. It provides fast retrieval of recent and semantically similar information using Redis Stack for efficient key-value storage and vector similarity search.

## Features

- Basic key-value caching with TTL support
- Vector embedding storage for semantic search
- Vector similarity search using Redis Stack's capabilities
- Cache statistics tracking (hits/misses)
- Secure credential handling from environment variables

## Usage

```python
from ece.components.context_cache.cache_manager import CacheManager

# Initialize the cache manager
cache = CacheManager()

# Store a value
cache.store('key1', 'This is a test value')

# Store a value with an embedding
embedding = [0.1, 0.2, 0.3, 0.4, 0.5]
cache.store('key2', 'This is another test value', embedding=embedding)

# Retrieve a value
entry = cache.retrieve('key1')
if entry:
    print(f"Value: {entry.value}")

# Perform semantic search
results = cache.semantic_search(embedding, top_k=5)

# Get cache statistics
stats = cache.get_statistics()
print(f"Cache hit rate: {stats['hit_rate']:.2%}")
```

## Requirements

- Redis Stack (for vector similarity search)
- Python 3.11+
- redis-py library

## Configuration

The CacheManager can be configured with the following environment variables:

- `REDIS_HOST` - Redis server host (default: localhost)
- `REDIS_PORT` - Redis server port (default: 6379)
- `REDIS_PASSWORD` - Redis password (default: None)