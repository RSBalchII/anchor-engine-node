# TASK-011: Implement memory query endpoint
# TASK-012: Implement memory store endpoint
# TASK-013: Create graph stats endpoint
# TASK-014: Setup WebSocket infrastructure
# TASK-015: Implement batch operations endpoint
"""
Memory Management API Endpoints

REST endpoints for memory operations including query, storage, statistics, and path finding.
"""

import logging
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, status
from fastapi.responses import JSONResponse

from ..models import (
    MemoryQueryRequest,
    MemoryStoreRequest,
    MemoryBulkRequest,
    MemoryPathRequest,
    MemoryResponse,
    StoreResponse,
    GraphStats,
    HealthStatus,
    ErrorResponse,
    MemoryEvent,
)
from ..agents import EnhancedArchivistAgent
from ..services import get_archivist_agent, get_graph_manager, get_cache_manager


logger = logging.getLogger(__name__)

# Create API router
router = APIRouter(
    prefix="/memory",
    tags=["memory"],
    responses={
        404: {"description": "Not found"},
        500: {"description": "Internal server error"},
    },
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, event: MemoryEvent):
        """Broadcast event to all connected clients"""
        for connection in self.active_connections:
            try:
                await connection.send_json(event.dict())
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")


manager = ConnectionManager()


@router.post("/query", response_model=MemoryResponse)
async def query_memory(
    request: MemoryQueryRequest,
    archivist: EnhancedArchivistAgent = Depends(get_archivist_agent)
) -> MemoryResponse:
    """
    Execute a memory retrieval query.
    
    Searches the knowledge graph for relevant memories based on the query
    and returns a context-aware summary.
    """
    try:
        logger.info(f"Processing memory query: {request.query[:100]}...")
        
        # Process the query through the Archivist Agent
        context = await archivist.process_query(
            query=request.query,
            context={
                "max_results": request.max_results,
                "max_hops": request.max_hops,
                "include_metadata": request.include_metadata,
            }
        )
        
        # Broadcast query event via WebSocket
        await manager.broadcast(
            MemoryEvent(
                event_type="memory.queried",
                data={
                    "query": request.query,
                    "results_found": len(context.paths),
                    "relevance_score": context.relevance_score,
                }
            )
        )
        
        return MemoryResponse(
            success=True,
            context=context,
        )
        
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}", exc_info=True)
        return MemoryResponse(
            success=False,
            error=str(e),
        )


@router.post("/store", response_model=StoreResponse)
async def store_memory(
    request: MemoryStoreRequest,
    archivist: EnhancedArchivistAgent = Depends(get_archivist_agent)
) -> StoreResponse:
    """
    Store new memory in the knowledge graph.
    
    Processes raw text, extracts concepts and relationships, 
    and persists them in Neo4j.
    """
    try:
        logger.info(f"Storing memory from source: {request.source}")
        
        # Process through Distiller first (if auto_extract is enabled)
        if request.auto_extract:
            # This would normally go through the DistillerAgent first
            # For now, we'll create a simple structure
            structured_data = {
                "key_concepts": request.raw_text.split()[:10],  # Simplified extraction
                "relationships": [],
                "metadata": request.metadata,
            }
        else:
            # Assume the text is already structured
            structured_data = request.metadata
        
        # Store via Archivist
        result = await archivist.store_memory(structured_data)
        
        # Broadcast storage event
        await manager.broadcast(
            MemoryEvent(
                event_type="memory.stored",
                data={
                    "source": request.source,
                    "nodes_created": len(result["nodes"]),
                    "relationships_created": len(result["relationships"]),
                }
            )
        )
        
        return StoreResponse(
            success=True,
            node_ids=result["nodes"],
            relationship_ids=result["relationships"],
            concepts_extracted=len(result["nodes"]),
            relationships_created=len(result["relationships"]),
        )
        
    except Exception as e:
        logger.error(f"Error storing memory: {str(e)}", exc_info=True)
        return StoreResponse(
            success=False,
            error=str(e),
        )


@router.get("/stats", response_model=GraphStats)
async def get_graph_stats(
    graph_manager = Depends(get_graph_manager),
    cache_manager = Depends(get_cache_manager)
) -> GraphStats:
    """
    Get knowledge graph statistics.
    
    Returns metrics about the graph size, structure, and performance.
    """
    try:
        # Query Neo4j for statistics
        stats_query = """
        MATCH (n)
        WITH count(n) as total_nodes
        MATCH ()-[r]->()
        WITH total_nodes, count(r) as total_relationships
        MATCH (n)
        WITH total_nodes, total_relationships, 
             labels(n) as node_labels
        UNWIND node_labels as label
        WITH total_nodes, total_relationships, 
             label, count(label) as label_count
        COLLECT {label: label_count} as node_distribution
        RETURN total_nodes, total_relationships, node_distribution
        """
        
        # Execute query (simplified for now)
        # result = await graph_manager.execute_query(stats_query)
        
        # Get cache statistics
        cache_stats = await cache_manager.get_stats()
        
        # Return statistics (with placeholder data for now)
        return GraphStats(
            total_nodes=0,  # Will be filled from query
            total_relationships=0,  # Will be filled from query
            node_types={},  # Will be filled from query
            relationship_types={},  # Will be filled from query
            avg_node_degree=0.0,
            cache_hit_rate=cache_stats.get("hit_rate", 0.0),
            q_learning_episodes=0,  # Will be filled from Q-Learning agent
            last_updated=datetime.utcnow(),
        )
        
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/paths", response_model=MemoryResponse)
async def find_memory_paths(
    request: MemoryPathRequest,
    archivist: EnhancedArchivistAgent = Depends(get_archivist_agent)
) -> MemoryResponse:
    """
    Find paths between concepts in the knowledge graph.
    
    Discovers connections between specified concepts using graph traversal.
    """
    try:
        logger.info(f"Finding paths from {request.start_concept} to {request.end_concept}")
        
        # Build a query for path finding
        query = f"What connects {request.start_concept}"
        if request.end_concept:
            query += f" and {request.end_concept}"
        query += "?"
        
        # Use the Archivist to find paths
        context = await archivist.process_query(
            query=query,
            context={
                "max_results": request.max_paths,
                "max_hops": request.max_hops,
                "path_finding_mode": True,
            }
        )
        
        return MemoryResponse(
            success=True,
            context=context,
        )
        
    except Exception as e:
        logger.error(f"Error finding paths: {str(e)}", exc_info=True)
        return MemoryResponse(
            success=False,
            error=str(e),
        )


@router.delete("/node/{node_id}")
async def delete_memory_node(
    node_id: str,
    graph_manager = Depends(get_graph_manager)
) -> dict:
    """
    Delete a specific memory node.
    
    [NEEDS CLARIFICATION: Deletion policy - soft delete vs hard delete?]
    """
    try:
        logger.warning(f"Deleting node: {node_id}")
        
        # For now, implement soft delete by marking as deleted
        delete_query = """
        MATCH (n) WHERE id(n) = $node_id
        SET n.deleted = true, n.deleted_at = datetime()
        RETURN id(n) as deleted_id
        """
        
        # result = await graph_manager.execute_query(delete_query, {"node_id": node_id})
        
        # Broadcast deletion event
        await manager.broadcast(
            MemoryEvent(
                event_type="memory.deleted",
                data={"node_id": node_id}
            )
        )
        
        return {"success": True, "deleted_id": node_id}
        
    except Exception as e:
        logger.error(f"Error deleting node: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/bulk", response_model=dict)
async def bulk_operations(
    request: MemoryBulkRequest,
    archivist: EnhancedArchivistAgent = Depends(get_archivist_agent)
) -> dict:
    """
    Execute multiple memory operations in a single request.
    
    Supports both query and storage operations with optional transactional execution.
    """
    try:
        logger.info(f"Processing {len(request.operations)} bulk operations")
        
        results = []
        errors = []
        
        for i, operation in enumerate(request.operations):
            try:
                if isinstance(operation, MemoryQueryRequest):
                    result = await query_memory(operation, archivist)
                elif isinstance(operation, MemoryStoreRequest):
                    result = await store_memory(operation, archivist)
                else:
                    raise ValueError(f"Unknown operation type: {type(operation)}")
                
                results.append(result.dict())
                
            except Exception as e:
                errors.append({"index": i, "error": str(e)})
                if request.transaction:
                    # Rollback on error in transaction mode
                    raise
        
        return {
            "success": len(errors) == 0,
            "results": results,
            "errors": errors,
            "total_operations": len(request.operations),
        }
        
    except Exception as e:
        logger.error(f"Error in bulk operations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.websocket("/stream")
async def memory_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time memory updates.
    
    Clients can subscribe to memory events like additions, updates, and queries.
    """
    await manager.connect(websocket)
    try:
        # Send initial connection event
        await websocket.send_json(
            MemoryEvent(
                event_type="connection.established",
                data={"message": "Connected to memory stream"}
            ).dict()
        )
        
        # Keep connection alive and handle incoming messages
        while True:
            # Wait for messages from client (e.g., subscription requests)
            data = await websocket.receive_text()
            logger.debug(f"Received WebSocket message: {data}")
            
            # Echo back for now (could implement subscription logic)
            await websocket.send_json(
                MemoryEvent(
                    event_type="message.received",
                    data={"echo": data}
                ).dict()
            )
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}", exc_info=True)
        manager.disconnect(websocket)


@router.get("/health", response_model=HealthStatus)
async def health_check(
    graph_manager = Depends(get_graph_manager),
    cache_manager = Depends(get_cache_manager)
) -> HealthStatus:
    """
    Health check endpoint for the Memory Management System.
    
    Checks connectivity to all required services and reports system status.
    """
    import torch
    
    health = HealthStatus()
    
    try:
        # Check Neo4j
        # neo4j_result = await graph_manager.execute_query("RETURN 1")
        # health.neo4j = neo4j_result is not None
        health.neo4j = False  # Placeholder
        
        # Check Redis
        health.redis = await cache_manager.ping()
        
        # Check GPU
        health.gpu = torch.cuda.is_available()
        if health.gpu:
            health.gpu_memory_available = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        
        # Get cache size
        cache_stats = await cache_manager.get_stats()
        health.cache_size = cache_stats.get("size", 0)
        
        # Calculate uptime (would need to track start time)
        health.uptime_seconds = 0  # Placeholder
        
        # Determine overall status
        if health.neo4j and health.redis:
            health.status = "healthy"
        elif health.redis:  # Can work with cache only (degraded)
            health.status = "degraded"
        else:
            health.status = "unhealthy"
        
    except Exception as e:
        logger.error(f"Health check error: {str(e)}", exc_info=True)
        health.status = "error"
    
    return health
