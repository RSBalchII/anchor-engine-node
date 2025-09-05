"""
Memory Management Models

This module contains all data models for the Memory Management System,
including request/response models, internal data structures, and entity definitions.
"""

from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, validator


# Enums
class QueryIntent(str, Enum):
    """Types of query intents"""
    FACTUAL = "factual"
    EXPLORATORY = "exploratory"
    TEMPORAL = "temporal"
    RELATIONSHIP = "relationship"


class SummarizationStrategy(str, Enum):
    """Summarization strategies"""
    EXTRACTIVE = "extractive"
    ABSTRACTIVE = "abstractive"
    PROGRESSIVE = "progressive"


# Core Models
class MemoryPath(BaseModel):
    """Represents a path through the knowledge graph"""
    nodes: List[str] = Field(default_factory=list, description="Node names in the path")
    relationships: List[Dict[str, Any]] = Field(default_factory=list, description="Relationships in the path")
    score: float = Field(default=0.0, description="Path relevance score")
    length: int = Field(default=0, description="Path length (number of hops)")


class MemoryContext(BaseModel):
    """Context built from memory retrieval"""
    query: str = Field(..., description="Original query")
    summary: str = Field(..., description="Context summary")
    paths: List[MemoryPath] = Field(default_factory=list, description="Retrieved memory paths")
    relevance_score: float = Field(default=0.0, description="Overall relevance score")
    token_count: int = Field(default=0, description="Token count of summary")
    processing_time_ms: float = Field(default=0.0, description="Processing time in milliseconds")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class QueryPlan(BaseModel):
    """Query execution plan"""
    concepts: List[str] = Field(default_factory=list, description="Extracted concepts")
    intent: str = Field(default="factual", description="Query intent type")
    original_query: str = Field(..., description="Original query text")
    constraints: Dict[str, Any] = Field(default_factory=dict, description="Query constraints")


# API Request Models
class MemoryQueryRequest(BaseModel):
    """Request model for memory queries"""
    query: str = Field(..., min_length=1, max_length=1000, description="Query text")
    max_results: int = Field(default=10, ge=1, le=100, description="Maximum results")
    max_hops: int = Field(default=5, ge=1, le=10, description="Maximum graph traversal depth")
    include_metadata: bool = Field(default=False, description="Include detailed metadata")
    
    @validator('query')
    def clean_query(cls, v):
        return v.strip()


class MemoryStoreRequest(BaseModel):
    """Request model for storing memories"""
    raw_text: str = Field(..., min_length=1, description="Raw text to process and store")
    source: Optional[str] = Field(None, description="Source identifier")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    auto_extract: bool = Field(default=True, description="Auto-extract concepts and relationships")


class MemoryBulkRequest(BaseModel):
    """Request model for bulk operations"""
    operations: List[Union[MemoryQueryRequest, MemoryStoreRequest]] = Field(
        ..., min_items=1, max_items=1000, description="List of operations"
    )
    transaction: bool = Field(default=True, description="Execute as transaction")


class MemoryPathRequest(BaseModel):
    """Request model for finding paths between concepts"""
    start_concept: str = Field(..., description="Starting concept")
    end_concept: Optional[str] = Field(None, description="Target concept (optional)")
    max_paths: int = Field(default=5, ge=1, le=20, description="Maximum paths to return")
    max_hops: int = Field(default=5, ge=1, le=10, description="Maximum path length")


# API Response Models
class MemoryResponse(BaseModel):
    """Response model for memory queries"""
    success: bool = Field(default=True, description="Operation success status")
    context: Optional[MemoryContext] = Field(None, description="Retrieved context")
    error: Optional[str] = Field(None, description="Error message if failed")
    request_id: str = Field(default_factory=lambda: str(datetime.utcnow().timestamp()))


class StoreResponse(BaseModel):
    """Response model for memory storage"""
    success: bool = Field(default=True, description="Operation success status")
    node_ids: List[Union[str, int]] = Field(default_factory=list, description="Created node IDs")
    relationship_ids: List[Union[str, int]] = Field(default_factory=list, description="Created relationship IDs")
    concepts_extracted: int = Field(default=0, description="Number of concepts extracted")
    relationships_created: int = Field(default=0, description="Number of relationships created")
    error: Optional[str] = Field(None, description="Error message if failed")


class GraphStats(BaseModel):
    """Knowledge graph statistics"""
    total_nodes: int = Field(default=0, description="Total number of nodes")
    total_relationships: int = Field(default=0, description="Total number of relationships")
    node_types: Dict[str, int] = Field(default_factory=dict, description="Node count by type")
    relationship_types: Dict[str, int] = Field(default_factory=dict, description="Relationship count by type")
    avg_node_degree: float = Field(default=0.0, description="Average node degree")
    cache_hit_rate: float = Field(default=0.0, description="Cache hit rate percentage")
    q_learning_episodes: int = Field(default=0, description="Q-Learning training episodes")
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class HealthStatus(BaseModel):
    """System health status"""
    status: str = Field(default="healthy", description="Overall status")
    neo4j: bool = Field(default=False, description="Neo4j connectivity")
    redis: bool = Field(default=False, description="Redis connectivity")
    gpu: bool = Field(default=False, description="GPU availability")
    gpu_memory_available: float = Field(default=0.0, description="GPU memory available (GB)")
    cache_size: int = Field(default=0, description="Current cache size (entries)")
    active_queries: int = Field(default=0, description="Active queries count")
    uptime_seconds: float = Field(default=0.0, description="System uptime")


class ErrorResponse(BaseModel):
    """Standard error response"""
    success: bool = Field(default=False)
    error: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Error code")
    details: Optional[Dict[str, Any]] = Field(None, description="Error details")
    request_id: str = Field(default_factory=lambda: str(datetime.utcnow().timestamp()))


# WebSocket Event Models
class MemoryEvent(BaseModel):
    """WebSocket memory event"""
    event_type: str = Field(..., description="Event type (memory.added, memory.updated, etc.)")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Dict[str, Any] = Field(default_factory=dict, description="Event data")
    correlation_id: Optional[str] = Field(None, description="Correlation ID for tracking")


# Export all models
__all__ = [
    "QueryIntent",
    "SummarizationStrategy",
    "MemoryPath",
    "MemoryContext",
    "QueryPlan",
    "MemoryQueryRequest",
    "MemoryStoreRequest",
    "MemoryBulkRequest",
    "MemoryPathRequest",
    "MemoryResponse",
    "StoreResponse",
    "GraphStats",
    "HealthStatus",
    "ErrorResponse",
    "MemoryEvent",
]
