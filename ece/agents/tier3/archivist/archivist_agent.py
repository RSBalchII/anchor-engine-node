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
                json=data
            )
            
            logger.info(f"Received response from Injector: status_code={response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Successful response from Injector: {result}")
                return result
            else:
                logger.error(f"Injector returned status {response.status_code}")
                return {
                    "success": False,
                    "error": f"Injector returned status {response.status_code}"
                }
        except httpx.ConnectError as e:
            logger.error(f"Connection error calling Injector: {str(e)}")
            return {
                "success": False,
                "error": f"Connection error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Error calling Injector: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
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
        
        # Synthesize context from paths
        context = []
        for path in paths:
            context.append({
                "path": path.nodes,
                "relationships": path.relationships,
                "relevance_score": path.score
            })
        
        return ContextResponse(
            context=context,
            metadata={
                "query": request.query,
                "timestamp": "2023-01-01T00:00:00Z",
                "source": "archivist",
                "paths_found": len(paths)
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
        
        # Convert DistillerData to dict for sending to Injector
        data_dict = {
            "entities": data.entities,
            "relationships": data.relationships,
            "summary": data.summary
        }
        
        # Log before sending to Injector
        logger.info("Sending data to Injector")
        logger.debug(f"Data to send: {data_dict}")
        
        # Send data to Injector for writing to Neo4j
        result = await injector_client.send_data_for_injection(data_dict)
        
        # Log the result from Injector
        logger.info(f"Received response from Injector: {result}")
        
        if result.get("success"):
            logger.info("Data successfully sent to Injector")
            return {"status": "processed", "message": "Data sent to Injector successfully"}
        else:
            logger.error(f"Failed to send data to Injector: {result.get('error')}")
            raise HTTPException(status_code=500, detail=f"Failed to inject data: {result.get('error')}")
    except Exception as e:
        logger.error(f"Error processing distiller data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

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