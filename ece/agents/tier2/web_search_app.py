"""
Web Search Agent App for the External Context Engine (ECE) v2.0 (Async).

This module implements the FastAPI app for the Web Search agent using a fully
asynchronous model to align with the ECE architecture and enable non-blocking I/O.
"""

import os
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import logging

# Import the WebSearchAgent
from ece.agents.tier2.web_search_agent import WebSearchAgent

# Import UTCP client for tool registration
from utcp_client.client import UTCPClient
from utcp_registry.models.tool import ToolDefinition
import asyncio

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="ECE Web Search Agent",
    description="The WebSearchAgent provides web search capabilities for the ECE.",
    version="1.0.0"
)

# Get Tavily API key from environment variables
tavily_api_key = os.getenv("TAVILY_API_KEY")
if not tavily_api_key:
    logger.warning("TAVILY_API_KEY not found in environment variables. Web search functionality will be limited.")

# Create an instance of the WebSearchAgent
web_search_agent = WebSearchAgent(model="nuextract:3.8b-q4_K_M", tavily_api_key=tavily_api_key)

class SearchRequest(BaseModel):
    """Model for search requests."""
    query: str

@app.get("/")
async def root():
    """Root endpoint for health check."""
    return {"message": "ECE Web Search Agent is running"}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.post("/search")
async def search(request: SearchRequest):
    """
    Endpoint to perform a web search.
    
    Args:
        request: SearchRequest containing the query
        
    Returns:
        Search results
    """
    try:
        logger.info(f"Received search request: {request.query}")
        
        # Call the WebSearchAgent to perform the search
        result = await web_search_agent.search(request.query)
        
        return {"success": True, "query": request.query, "result": result}
    except Exception as e:
        logger.error(f"Error performing search: {e}")
        raise HTTPException(status_code=500, detail=f"Error performing search: {str(e)}")

@app.on_event("startup")
async def startup_event():
    """Initialize UTCP Client and register WebSearch tools on startup."""
    # Initialize UTCP Client for tool registration
    utcp_registry_url = os.getenv("UTCP_REGISTRY_URL", "http://utcp-registry:8005")
    app.state.utcp_client = UTCPClient(utcp_registry_url)
    
    # Register WebSearch tools with UTCP Registry
    await _register_websearch_tools(app.state.utcp_client)

async def _register_websearch_tools(utcp_client: UTCPClient):
    """Register WebSearch tools with the UTCP Registry."""
    try:
        # Register websearch.search tool
        search_tool = ToolDefinition(
            id="websearch.search",
            name="Web Search",
            description="Perform a web search using the Tavily API",
            category="web",
            parameters={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to perform"
                    }
                },
                "required": ["query"]
            },
            returns={
                "type": "object",
                "properties": {
                    "success": {
                        "type": "boolean",
                        "description": "Whether the search was successful"
                    },
                    "query": {
                        "type": "string",
                        "description": "The search query performed"
                    },
                    "result": {
                        "type": "string",
                        "description": "The search results"
                    },
                    "error": {
                        "type": "string",
                        "description": "Error message if search failed"
                    },
                    "timestamp": {
                        "type": "string",
                        "description": "Timestamp of the search"
                    }
                }
            },
            endpoint="http://websearch-agent:8007/search",
            version="1.0.0",
            agent="WebSearchAgent"
        )
        
        success = await utcp_client.register_tool(search_tool)
        if success:
            logger.info("✅ Registered websearch.search tool with UTCP Registry")
        else:
            logger.error("❌ Failed to register websearch.search tool with UTCP Registry")
            
    except Exception as e:
        logger.error(f"❌ Error registering WebSearch tools with UTCP Registry: {e}")

# Cleanup on shutdown
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown."""
    pass

if __name__ == "__main__":
    uvicorn.run(
        "web_search_app:app",
        host="0.0.0.0",
        port=8007,
        reload=True,
        log_level="info"
    )