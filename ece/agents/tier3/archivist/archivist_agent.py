#!/usr/bin/env python3
"""
Archivist Agent for the External Context Engine (ECE).

The Archivist is the master controller of the Tier 3 Memory Cortex. It serves as the 
primary API gateway for external requests for context and acts as the central coordinator 
for all long-term memory operations.
"""

import uvicorn
import httpx
import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="ECE Archivist Agent",
    description="The Archivist is the master controller of the Tier 3 Memory Cortex.",
    version="1.0.0"
)

class ContextRequest(BaseModel):
    """Model for context request from external modules."""
    query: str
    user_id: Optional[str] = None

class ContextResponse(BaseModel):
    """Model for context response to external modules."""
    context: List[Dict[str, Any]]
    metadata: Dict[str, Any]

class DistillerData(BaseModel):
    """Model for data received from the Distiller agent."""
    entities: List[Dict[str, Any]]
    relationships: List[Dict[str, Any]]
    summary: str

class QLearningPathRequest(BaseModel):
    """Model for requesting paths from the QLearningAgent."""
    start_node: str
    end_node: str

class MemoryPath(BaseModel):
    """Model for a path through the knowledge graph."""
    nodes: List[str] = []
    relationships: List[Dict[str, Any]] = []
    score: float = 0.0
    length: int = 0

# QLearningAgent client
class QLearningAgentClient:
    """Client for communicating with the QLearningAgent."""
    
    def __init__(self, base_url: str = "http://localhost:8002"):
        self.base_url = base_url
        self.client = httpx.AsyncClient()
    
    async def find_optimal_path(self, start_node: str, end_node: str) -> List[MemoryPath]:
        """
        Find the optimal path between start and end nodes using Q-learning.
        
        Args:
            start_node: The starting node ID
            end_node: The target node ID
            
        Returns:
            List of MemoryPath objects ranked by Q-values
        """
        try:
            request_data = QLearningPathRequest(
                start_node=start_node,
                end_node=end_node
            )
            
            response = await self.client.post(
                f"{self.base_url}/find_optimal_path",
                json=request_data.dict()
            )
            
            if response.status_code == 200:
                paths_data = response.json()
                paths = [MemoryPath(**path_data) for path_data in paths_data]
                return paths
            else:
                logger.error(f"QLearningAgent returned status {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error calling QLearningAgent: {str(e)}")
            return []

# Injector client
class InjectorClient:
    """Client for communicating with the Injector agent."""
    
    def __init__(self, base_url: str = "http://localhost:8004"):
        self.base_url = base_url
        self.client = httpx.AsyncClient()
    
    async def send_data_for_injection(self, data: dict) -> dict:
        """
        Send data to the Injector agent for writing to the Neo4j database.
        
        Args:
            data (dict): Structured data to be injected into the Neo4j database.
            
        Returns:
            dict: Result of the injection operation.
        """
        try:
            logger.info(f"Sending data to Injector at {self.base_url}/internal/data_to_inject")
            logger.debug(f"Data being sent: {data}")
            
            response = await self.client.post(
                f"{self.base_url}/internal/data_to_inject",
                json=data,
                timeout=30.0  # Add a timeout
            )
            
            logger.info(f"Received response from Injector: status_code={response.status_code}")
            logger.debug(f"Response headers: {response.headers}")
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Successful response from Injector: {result}")
                logger.debug(f"Result type: {type(result)}")
                return result
            else:
                error_text = response.text
                logger.error(f"Injector returned status {response.status_code} with body: {error_text}")
                logger.debug(f"Error text type: {type(error_text)}")
                return {
                    "success": False,
                    "error": f"Injector returned status {response.status_code}: {error_text}"
                }
        except httpx.ConnectError as e:
            logger.error(f"Connection error calling Injector: {str(e)}")
            return {
                "success": False,
                "error": f"Connection error: {str(e)}"
            }
        except httpx.TimeoutException as e:
            logger.error(f"Timeout error calling Injector: {str(e)}")
            return {
                "success": False,
                "error": f"Timeout error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Error calling Injector: {str(e)}", exc_info=True)
            error_str = str(e)
            logger.debug(f"Error string: {error_str}, type: {type(error_str)}")
            # Check if error_str is callable (it shouldn't be)
            if callable(error_str):
                logger.error("error_str is callable, which is unexpected")
                return {
                    "success": False,
                    "error": "Unexpected callable error string"
                }
            return {
                "success": False,
                "error": f"Unexpected error: {error_str}"
            }

# Initialize clients
qlearning_client = QLearningAgentClient()
injector_client = InjectorClient()

@app.get("/")
async def root():
    """Root endpoint for health check."""
    return {"message": "ECE Archivist Agent is running"}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.post("/context", response_model=ContextResponse)
async def get_context(request: ContextRequest):
    """
    External API endpoint to handle context requests.
    
    Args:
        request: ContextRequest containing the query
        
    Returns:
        ContextResponse with relevant context
    """
    try:
        logger.info(f"Received context request: {request.query}")
        
        # For demonstration, we'll use a simple example
        # In a real implementation, we would parse the query to identify start/end nodes
        start_node = "concept_start"
        end_node = "concept_end"
        
        # Call QLearningAgent to find optimal paths
        paths = await qlearning_client.find_optimal_path(start_node, end_node)
        
        # Synthesize context from paths with more sophisticated processing
        context = []
        for i, path in enumerate(paths):
            # Extract key information from the path
            path_info = {
                "path_id": i,
                "nodes": path.nodes,
                "relationships": path.relationships,
                "relevance_score": path.score,
                "path_length": path.length
            }
            
            # Add additional context information
            if path.nodes:
                path_info["start_node"] = path.nodes[0] if len(path.nodes) > 0 else None
                path_info["end_node"] = path.nodes[-1] if len(path.nodes) > 0 else None
            
            # Process relationships to extract key information
            if path.relationships:
                path_info["relationship_types"] = list(set(rel.get("type", "UNKNOWN") for rel in path.relationships))
                path_info["entities_involved"] = list(set(
                    [rel.get("start_id") for rel in path.relationships if rel.get("start_id")] +
                    [rel.get("end_id") for rel in path.relationships if rel.get("end_id")]
                ))
            
            context.append(path_info)
        
        # Sort paths by relevance score (descending)
        context.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
        
        # Limit the number of paths returned to prevent overwhelming the client
        max_paths = 10
        context = context[:max_paths]
        
        return ContextResponse(
            context=context,
            metadata={
                "query": request.query,
                "timestamp": "2023-01-01T00:00:00Z",
                "source": "archivist",
                "paths_found": len(paths),
                "paths_returned": len(context)
            }
        )
    except Exception as e:
        logger.error(f"Error processing context request: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/internal/data_to_archive")
async def receive_distiller_data(data: DistillerData):
    """
    Internal endpoint to receive structured data from the Distiller.
    
    Args:
        data: DistillerData containing entities, relationships, and summary
        
    Returns:
        Status of data processing
    """
    try:
        logger.info(f"Received data from Distiller: {len(data.entities)} entities, {len(data.relationships)} relationships")
        
        # Log the received data for debugging
        logger.debug(f"Distiller data: {data}")
        logger.debug(f"Distiller data type: {type(data)}")
        
        # Apply business logic to filter and process the data
        # For demonstration, we'll implement some basic filtering rules:
        
        # 1. Filter entities - only send entities with certain types or properties
        filtered_entities = []
        for entity in data.entities:
            # Example business rule: Only send entities with a 'name' property
            if entity.get('properties', {}).get('name'):
                # Example business rule: Only send entities of certain types
                entity_type = entity.get('type', '')
                if entity_type in ['Concept', 'Person', 'Organization', 'Event', 'Product']:
                    filtered_entities.append(entity)
        
        # 2. Filter relationships - only send relationships with certain types or properties
        filtered_relationships = []
        for relationship in data.relationships:
            # Example business rule: Only send relationships with a 'type' property
            if relationship.get('type'):
                # Example business rule: Only send relationships of certain types
                rel_type = relationship.get('type', '')
                if rel_type in ['RELATED_TO', 'PART_OF', 'CREATED_BY', 'WORKS_FOR', 'LOCATED_IN']:
                    filtered_relationships.append(relationship)
        
        # 3. Apply additional business rules
        # Example: Only send data if there are at least 1 entity and 1 relationship
        if len(filtered_entities) < 1 or len(filtered_relationships) < 1:
            logger.info("Data does not meet minimum criteria for archiving")
            return {"status": "filtered", "message": "Data filtered out by business rules"}
        
        # Example: Limit the number of entities and relationships to prevent overwhelming the database
        max_entities = 50
        max_relationships = 100
        if len(filtered_entities) > max_entities:
            logger.warning(f"Truncating entities from {len(filtered_entities)} to {max_entities}")
            filtered_entities = filtered_entities[:max_entities]
        if len(filtered_relationships) > max_relationships:
            logger.warning(f"Truncating relationships from {len(filtered_relationships)} to {max_relationships}")
            filtered_relationships = filtered_relationships[:max_relationships]
        
        # Log the filtered data
        logger.info(f"Filtered data: {len(filtered_entities)} entities, {len(filtered_relationships)} relationships")
        logger.debug(f"Filtered entities: {filtered_entities}")
        logger.debug(f"Filtered relationships: {filtered_relationships}")
        
        # Convert filtered data to dict for sending to Injector
        data_dict = {
            "entities": filtered_entities,
            "relationships": filtered_relationships,
            "summary": data.summary
        }
        
        # Log before sending to Injector
        logger.info("Sending filtered data to Injector")
        logger.debug(f"Data to send: {data_dict}")
        logger.debug(f"Data dict type: {type(data_dict)}")
        
        # Check if injector_client is properly initialized
        if not hasattr(injector_client, 'send_data_for_injection'):
            logger.error("injector_client does not have send_data_for_injection method")
            raise HTTPException(status_code=500, detail="Injector client not properly initialized")
        
        # Check if send_data_for_injection is callable
        if not callable(getattr(injector_client, 'send_data_for_injection', None)):
            logger.error("injector_client.send_data_for_injection is not callable")
            raise HTTPException(status_code=500, detail="Injector client method not callable")
        
        # Send data to Injector for writing to Neo4j
        try:
            result = await injector_client.send_data_for_injection(data_dict)
            logger.debug(f"Result from injector_client.send_data_for_injection: {result}")
            logger.debug(f"Result type: {type(result)}")
        except Exception as e:
            logger.error(f"Error calling injector_client.send_data_for_injection: {type(e).__name__}: {e}")
            raise HTTPException(status_code=500, detail=f"Error calling injector: {type(e).__name__}: {e}")
        
        # Log the result from Injector
        logger.info(f"Received response from Injector: {result}")
        logger.debug(f"Result type: {type(result)}")
        
        if result.get("success"):
            logger.info("Data successfully sent to Injector")
            return {"status": "processed", "message": "Data sent to Injector successfully"}
        else:
            error_msg = result.get('error', 'Unknown error')
            logger.debug(f"error_msg: {error_msg}, type: {type(error_msg)}")
            # Check if error_msg is callable (it shouldn't be)
            if callable(error_msg):
                logger.error("error_msg is callable, which is unexpected")
                raise HTTPException(status_code=500, detail="error_msg is callable")
            logger.error(f"Failed to send data to Injector: {error_msg}")
            raise HTTPException(status_code=500, detail=f"Failed to inject data: {error_msg}")
    except HTTPException:
        # Re-raise HTTP exceptions directly
        raise
    except Exception as e:
        logger.error(f"Error processing distiller data: {str(e)}", exc_info=True)
        error_str = str(e)
        logger.debug(f"error_str: {error_str}, type: {type(error_str)}")
        # Check if error_str is callable (it shouldn't be)
        if callable(error_str):
            logger.error("error_str is callable, which is unexpected")
            raise HTTPException(status_code=500, detail="error_str is callable")
        # Check if there's any place in error_str where we might be calling a string
        if "'str' object is not callable" in error_str:
            logger.error("Detected 'str' object is not callable error in error_str")
            # Extract the original error from the error_str
            # This is a hacky way to get the original error, but it should work for debugging
            import re
            match = re.search(r"'([^']+)' object is not callable", error_str)
            if match:
                obj_str = match.group(1)
                logger.error(f"Object that is not callable: {obj_str}")
                # Try to identify where this object is coming from
                if obj_str in ["error", "result", "data", "response"]:
                    logger.error(f"Object {obj_str} might be accidentally called as a function")
        raise HTTPException(status_code=500, detail=f"Internal server error: {error_str}")

# Cleanup on shutdown
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown."""
    await qlearning_client.client.aclose()
    await injector_client.client.aclose()

if __name__ == "__main__":
    uvicorn.run(
        "archivist_agent:app",
        host="0.0.0.0",
        port=8003,
        reload=True,
        log_level="info"
    )