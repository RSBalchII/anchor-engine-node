"""
Cache Manager Service

Provides multi-level caching with Redis backend and local LRU cache,
optimized for the Memory Management System.
"""

import asyncio
import logging
import pickle
import json
from typing import Any, Optional, Dict
from datetime import datetime, timedelta
from collections import OrderedDict
import hashlib

logger = logging.getLogger(__name__)

# Conditional Redis import
try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available. Using in-memory cache only.")


class LRUCache:
    """Simple LRU cache implementation."""
    
    def __init__(self, maxsize: int = 1000):
        self.cache = OrderedDict()
        self.maxsize = maxsize
    
    def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            # Move to end (most recently used)
            self.cache.move_to_end(key)
            return self.cache[key]
        return None
    
    def set(self, key: str, value: Any):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.maxsize:
            # Remove least recently used
            self.cache.popitem(last=False)
    
    def delete(self, key: str):
        if key in self.cache:
            del self.cache[key]
    
    def clear(self):
        self.cache.clear()
    
    def __contains__(self, key: str) -> bool:
        return key in self.cache
    
    def __len__(self) -> int:
        return len(self.cache)


class CacheManager:
    """
    Multi-level cache manager with Redis backend and local LRU cache.
    
    Optimized for 32GB cache pool allocation.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize Cache Manager.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config or {}
        
        # Configuration
        self.redis_url = self.config.get("redis_url", "redis://localhost:6379")
        self.ttl = self.config.get("ttl_seconds", 3600)
        self.max_size_mb = self.config.get("max_size_mb", 32768)  # 32GB
        self.local_cache_size = self.config.get("local_cache_size", 1000)
        self.warmup_on_start = self.config.get("warmup_on_start", True)
        
        # Initialize caches
        self.local_cache = LRUCache(maxsize=self.local_cache_size)
        self.redis_client = None
        
        # Statistics
        self.stats = {
            "hits": 0,
            "misses": 0,
            "local_hits": 0,
            "redis_hits": 0,
            "sets": 0,
            "deletes": 0,
            "errors": 0,
            "start_time": datetime.utcnow()
        }
        
        # Initialize Redis connection
        asyncio.create_task(self._initialize_redis())
        
        logger.info(f"Cache Manager initialized with {self.max_size_mb}MB Redis cache")
    
    async def _initialize_redis(self):
        """Initialize Redis connection."""
        if not REDIS_AVAILABLE:
            logger.warning("Redis module not installed. Using local cache only.")
            return
        
        try:
            self.redis_client = await aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=False,  # We'll handle encoding
                max_connections=100
            )
            
            # Test connection
            await self.redis_client.ping()
            logger.info("Redis connection established")
            
            # Warm up cache if configured
            if self.warmup_on_start:
                await self._warmup_cache()
                
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            self.redis_client = None
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache (multi-level).
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None
        """
        # Normalize key
        cache_key = self._normalize_key(key)
        
        # Level 1: Local cache
        value = self.local_cache.get(cache_key)
        if value is not None:
            self.stats["hits"] += 1
            self.stats["local_hits"] += 1
            return value
        
        # Level 2: Redis cache
        if self.redis_client:
            try:
                redis_value = await self.redis_client.get(cache_key)
                if redis_value:
                    # Deserialize
                    value = self._deserialize(redis_value)
                    
                    # Populate local cache
                    self.local_cache.set(cache_key, value)
                    
                    self.stats["hits"] += 1
                    self.stats["redis_hits"] += 1
                    return value
                    
            except Exception as e:
                logger.error(f"Redis get error: {e}")
                self.stats["errors"] += 1
        
        # Cache miss
        self.stats["misses"] += 1
        return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        skip_local: bool = False
    ) -> bool:
        """
        Set value in cache (multi-level).
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds
            skip_local: Skip local cache
            
        Returns:
            Success status
        """
        # Normalize key
        cache_key = self._normalize_key(key)
        ttl = ttl or self.ttl
        
        try:
            # Level 1: Local cache (unless skipped)
            if not skip_local:
                self.local_cache.set(cache_key, value)
            
            # Level 2: Redis cache
            if self.redis_client:
                # Serialize value
                serialized = self._serialize(value)
                
                # Set with TTL
                await self.redis_client.setex(
                    cache_key,
                    ttl,
                    serialized
                )
            
            self.stats["sets"] += 1
            return True
            
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            self.stats["errors"] += 1
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Delete value from cache (all levels).
        
        Args:
            key: Cache key
            
        Returns:
            Success status
        """
        # Normalize key
        cache_key = self._normalize_key(key)
        
        try:
            # Level 1: Local cache
            self.local_cache.delete(cache_key)
            
            # Level 2: Redis cache
            if self.redis_client:
                await self.redis_client.delete(cache_key)
            
            self.stats["deletes"] += 1
            return True
            
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            self.stats["errors"] += 1
            return False
    
    async def clear(self, pattern: Optional[str] = None) -> int:
        """
        Clear cache entries.
        
        Args:
            pattern: Optional pattern to match keys
            
        Returns:
            Number of entries cleared
        """
        count = 0
        
        try:
            # Clear local cache
            if pattern is None:
                self.local_cache.clear()
                count = len(self.local_cache)
            
            # Clear Redis cache
            if self.redis_client:
                if pattern:
                    # Delete matching keys
                    async for key in self.redis_client.scan_iter(match=pattern):
                        await self.redis_client.delete(key)
                        count += 1
                else:
                    # Flush all
                    await self.redis_client.flushdb()
                    count += await self.redis_client.dbsize()
            
            logger.info(f"Cleared {count} cache entries")
            return count
            
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
            return 0
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        # Calculate hit rate
        total_requests = self.stats["hits"] + self.stats["misses"]
        hit_rate = (self.stats["hits"] / total_requests * 100) if total_requests > 0 else 0
        
        # Get Redis info
        redis_info = {}
        if self.redis_client:
            try:
                info = await self.redis_client.info()
                redis_info = {
                    "used_memory_mb": info.get("used_memory", 0) / (1024 * 1024),
                    "connected_clients": info.get("connected_clients", 0),
                    "total_connections": info.get("total_connections_received", 0),
                    "keyspace_hits": info.get("keyspace_hits", 0),
                    "keyspace_misses": info.get("keyspace_misses", 0),
                }
            except Exception as e:
                logger.error(f"Could not get Redis info: {e}")
        
        # Calculate uptime
        uptime = (datetime.utcnow() - self.stats["start_time"]).total_seconds()
        
        return {
            "hit_rate": hit_rate,
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "local_hits": self.stats["local_hits"],
            "redis_hits": self.stats["redis_hits"],
            "sets": self.stats["sets"],
            "deletes": self.stats["deletes"],
            "errors": self.stats["errors"],
            "local_cache_size": len(self.local_cache),
            "local_cache_max": self.local_cache_size,
            "redis_info": redis_info,
            "uptime_seconds": uptime,
            "size": len(self.local_cache)  # For compatibility
        }
    
    async def ping(self) -> bool:
        """Check cache connectivity."""
        try:
            if self.redis_client:
                await self.redis_client.ping()
                return True
            return False  # No Redis, but local cache works
        except Exception:
            return False
    
    async def _warmup_cache(self):
        """Warm up cache with frequently accessed data."""
        logger.info("Starting cache warmup...")
        
        try:
            # Get popular keys from Redis
            if self.redis_client:
                # Get a sample of keys
                keys = []
                async for key in self.redis_client.scan_iter(count=100):
                    keys.append(key)
                    if len(keys) >= 100:
                        break
                
                # Load into local cache
                for key in keys[:self.local_cache_size // 2]:  # Use half capacity
                    value = await self.redis_client.get(key)
                    if value:
                        self.local_cache.set(
                            key.decode() if isinstance(key, bytes) else key,
                            self._deserialize(value)
                        )
                
                logger.info(f"Cache warmup complete. Loaded {len(keys)} entries")
                
        except Exception as e:
            logger.error(f"Cache warmup failed: {e}")
    
    def _normalize_key(self, key: str) -> str:
        """Normalize cache key."""
        # Add prefix to avoid collisions
        prefix = "ece:mms:"
        
        # Hash long keys
        if len(key) > 200:
            key_hash = hashlib.md5(key.encode()).hexdigest()
            return f"{prefix}hash:{key_hash}"
        
        return f"{prefix}{key}"
    
    def _serialize(self, value: Any) -> bytes:
        """Serialize value for storage."""
        try:
            # Try JSON first (more portable)
            return json.dumps(value).encode()
        except (TypeError, ValueError):
            # Fall back to pickle for complex objects
            return pickle.dumps(value)
    
    def _deserialize(self, data: bytes) -> Any:
        """Deserialize value from storage."""
        try:
            # Try JSON first
            return json.loads(data.decode())
        except (json.JSONDecodeError, UnicodeDecodeError):
            # Fall back to pickle
            return pickle.loads(data)
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.redis_client:
            await self.redis_client.close()
