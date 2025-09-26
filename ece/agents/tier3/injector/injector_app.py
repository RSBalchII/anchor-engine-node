import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime
import logging
import os
import sys

# Add the injector agent directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from .injector_agent import InjectorAgent
from ece.common.poml_schemas import POML, MemoryNode

# Import UTCP client for tool registration
from utcp_client.client import UTCPClient
from utcp_registry.models.tool import ToolDefinition

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="ECE Injector Agent",
    description="The Injector is a simple, specialized Tier 3 agent whose sole responsibility is to write data to the Neo4j knowledge graph.",
    version="1.0.0"
)

# Get Neo4j connection details from environment variables, with defaults for local development
neo4j_uri = os.environ.get('NEO4J_URI', 'bolt://neo4j:7687')
neo4j_user = os.environ.get('NEO4J_USER', 'neo4j')
neo4j_password = os.environ.get('NEO4J_PASSWORD', 'password')

# Create an instance of the injector agent
injector_agent = InjectorAgent(
    neo4j_uri=neo4j_uri,
    neo4j_user=neo4j_user,
    neo4j_password=neo4j_password
)

class InjectionData(BaseModel):
    """Model for data to be injected into the Neo4j database."""
    entities: List[Dict[str, Any]] = []
    relationships: List[Dict[str, Any]] = []
    summary: str = ""

class TemporalNodeRequest(BaseModel):
    """Model for temporal node requests."""
    timestamp: str

class MemoryLinkRequest(BaseModel):
    """Model for linking memory to temporal nodes."""
    memory_node_id: int
    timestamp: str

@app.get("/")
async def root():
    """Root endpoint for health check."""
    return {"message": "ECE Injector Agent is running"}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.post("/internal/data_to_inject")
async def receive_data_for_injection(poml_request: POML):
    """
    Internal endpoint to receive structured data from the Archivist for injection into Neo4j.
    
    Args:
        poml_request: POML document containing the data to be injected.
        
    Returns:
        Status of data injection
    """
    try:
        logger.info(f"Received POML data for injection")
        
        # Extract data from the POML document
        data = poml_request.directive.task.get("data", {})
        
        # Log the incoming data (at debug level to avoid logging sensitive information in production)
        logger.debug(f"Received POML data for injection: {type(data)}")
        logger.debug(f"Data content: {data}")
        
        # Check if injector_agent is properly initialized
        if not hasattr(injector_agent, 'receive_data_for_injection'):
            logger.error("injector_agent does not have receive_data_for_injection method")
            raise HTTPException(status_code=500, detail="Injector agent not properly initialized")
        
        # Check if receive_data_for_injection is callable
        if not callable(getattr(injector_agent, 'receive_data_for_injection', None)):
            logger.error("injector_agent.receive_data_for_injection is not callable")
            raise HTTPException(status_code=500, detail="Injector agent method not callable")
        
        # Call the injector agent to process the data
        logger.info("Calling injector_agent.receive_data_for_injection")
        result = injector_agent.receive_data_for_injection(data)
        logger.info(f"Received result from injector_agent: {result}")
        logger.debug(f"Result type: {type(result)}")
        
        # Check if result is a dict
        if not isinstance(result, dict):
            logger.error(f"Expected dict from injector_agent.receive_data_for_injection, got {type(result)}: {result}")
            raise HTTPException(status_code=500, detail=f"Unexpected result type from injector agent: {type(result)}")
        
        if result.get("success"):
            logger.info("Data successfully injected")
            # Return a POML response
            response_poml = MemoryNode(
                identity={
                    "name": "InjectorAgent",
                    "version": "1.0",
                    "type": "Specialized Data Injection Agent"
                },
                operational_context={
                    "project": "External Context Engine (ECE) v3.0",
                    "objective": "Inject data into the Neo4j knowledge graph."
                },
                directive={
                    "goal": "Provide status of data injection operation.",
                    "task": {
                        "name": "InjectData",
                        "steps": [
                            "Receive data from Archivist",
                            "Translate data to Cypher queries",
                            "Execute queries in transaction"
                        ]
                    }
                },
                node_data=result,
                node_type="InjectionResult"
            )
            return response_poml.dict()
        else:
            error_msg = result.get('error', 'Unknown error')
            logger.debug(f"error_msg: {error_msg}, type: {type(error_msg)}")
            # Check if error_msg is callable (it shouldn't be)
            if callable(error_msg):
                logger.error("error_msg is callable, which is unexpected")
                raise HTTPException(status_code=500, detail="error_msg is callable")
            logger.error(f"Failed to inject data: {error_msg}")
            # Create an error response in POML format
            error_response = MemoryNode(
                identity={
                    "name": "InjectorAgent",
                    "version": "1.0",
                    "type": "Specialized Data Injection Agent"
                },
                operational_context={
                    "project": "External Context Engine (ECE) v3.0",
                    "objective": "Inject data into the Neo4j knowledge graph."
                },
                directive={
                    "goal": "Provide status of data injection operation.",
                    "task": {
                        "name": "InjectData",
                        "steps": [
                            "Receive data from Archivist",
                            "Translate data to Cypher queries",
                            "Execute queries in transaction"
                        ]
                    }
                },
                node_data={
                    "success": False,
                    "error": error_msg
                },
                node_type="InjectionError"
            )
            return error_response.dict()
    except HTTPException:
        # Re-raise HTTP exceptions directly
        raise
    except Exception as e:
        logger.error(f"Error processing injection data: {str(e)}", exc_info=True)
        error_str = str(e)
        logger.debug(f"error_str: {error_str}, type: {type(error_str)}")
        # Check if error_str is callable (it shouldn't be)
        if callable(error_str):
            logger.error("error_str is callable, which is unexpected")
            raise HTTPException(status_code=500, detail="error_str is callable")
        # Create an error response in POML format
        error_response = MemoryNode(
            identity={
                "name": "InjectorAgent",
                "version": "1.0",
                "type": "Specialized Data Injection Agent"
            },
            operational_context={
                "project": "External Context Engine (ECE) v3.0",
                "objective": "Inject data into the Neo4j knowledge graph."
            },
            directive={
                "goal": "Provide status of data injection operation.",
                "task": {
                    "name": "InjectData",
                    "steps": [
                        "Receive data from Archivist",
                        "Translate data to Cypher queries",
                        "Execute queries in transaction"
                    ]
                }
            },
            node_data={
                "success": False,
                "error": error_str
            },
            node_type="InjectionError"
        )
        return error_response.dict()

@app.post("/internal/temporal/get_or_create_timenode")
async def get_or_create_timenode(request: TemporalNodeRequest):
    """
    Internal endpoint to create a chronological tree of nodes.
    
    Args:
        request: TemporalNodeRequest containing timestamp
        
    Returns:
        Day node information
    """
    try:
        logger.info(f"Received request to create time node for timestamp: {request.timestamp}")
        
        # Call the injector agent to process the request
        result = injector_agent.get_or_create_timenode(request.timestamp)
        
        if result.get("success"):
            logger.info("Time node created successfully")
            # Return a POML response
            response_poml = MemoryNode(
                identity={
                    "name": "InjectorAgent",
                    "version": "1.0",
                    "type": "Specialized Data Injection Agent"
                },
                operational_context={
                    "project": "External Context Engine (ECE) v3.0",
                    "objective": "Inject data into the Neo4j knowledge graph."
                },
                directive={
                    "goal": "Provide status of temporal node creation operation.",
                    "task": {
                        "name": "CreateTimeNode",
                        "steps": [
                            "Receive timestamp from Archivist",
                            "Create chronological tree of nodes",
                            "Return time node information"
                        ]
                    }
                },
                node_data=result.get("time_node", {}),
                node_type="TemporalNodeResult"
            )
            return response_poml.dict()
        else:
            error_msg = result.get('error', 'Unknown error')
            logger.error(f"Failed to create time node: {error_msg}")
            # Create an error response in POML format
            error_response = MemoryNode(
                identity={
                    "name": "InjectorAgent",
                    "version": "1.0",
                    "type": "Specialized Data Injection Agent"
                },
                operational_context={
                    "project": "External Context Engine (ECE) v3.0",
                    "objective": "Inject data into the Neo4j knowledge graph."
                },
                directive={
                    "goal": "Provide status of temporal node creation operation.",
                    "task": {
                        "name": "CreateTimeNode",
                        "steps": [
                            "Receive timestamp from Archivist",
                            "Create chronological tree of nodes",
                            "Return time node information"
                        ]
                    }
                },
                node_data={
                    "success": False,
                    "error": error_msg
                },
                node_type="TemporalNodeError"
            )
            return error_response.dict()
    except HTTPException:
        # Re-raise HTTP exceptions directly
        raise
    except Exception as e:
        logger.error(f"Error processing time node request: {str(e)}", exc_info=True)
        # Create an error response in POML format
        error_response = MemoryNode(
            identity={
                "name": "InjectorAgent",
                "version": "1.0",
                "type": "Specialized Data Injection Agent"
            },
            operational_context={
                "project": "External Context Engine (ECE) v3.0",
                "objective": "Inject data into the Neo4j knowledge graph."
            },
            directive={
                "goal": "Provide status of temporal node creation operation.",
                "task": {
                    "name": "CreateTimeNode",
                    "steps": [
                        "Receive timestamp from Archivist",
                        "Create chronological tree of nodes",
                        "Return time node information"
                    ]
                }
            },
            node_data={
                "success": False,
                "error": str(e)
            },
            node_type="TemporalNodeError"
        )
        return error_response.dict()

@app.post("/internal/temporal/link_memory_to_timenode")
async def link_memory_to_timenode(request: MemoryLinkRequest):
    """
    Internal endpoint to link a memory node to a temporal node.
    
    Args:
        request: MemoryLinkRequest containing memory node ID and timestamp
        
    Returns:
        Status of the link operation
    """
    try:
        logger.info(f"Received request to link memory {request.memory_node_id} to time node for timestamp: {request.timestamp}")
        
        # Call the injector agent to process the request
        result = injector_agent.link_memory_to_timenode(request.memory_node_id, request.timestamp)
        
        if result.get("success"):
            logger.info("Memory node linked to time node successfully")
            # Return a POML response
            response_poml = MemoryNode(
                identity={
                    "name": "InjectorAgent",
                    "version": "1.0",
                    "type": "Specialized Data Injection Agent"
                },
                operational_context={
                    "project": "External Context Engine (ECE) v3.0",
                    "objective": "Inject data into the Neo4j knowledge graph."
                },
                directive={
                    "goal": "Provide status of memory linking operation.",
                    "task": {
                        "name": "LinkMemoryToTimeNode",
                        "steps": [
                            "Receive memory node ID and timestamp from Archivist",
                            "Link memory node to temporal node",
                            "Return operation status"
                        ]
                    }
                },
                node_data=result,
                node_type="LinkMemoryResult"
            )
            return response_poml.dict()
        else:
            error_msg = result.get('error', 'Unknown error')
            logger.error(f"Failed to link memory node to time node: {error_msg}")
            # Create an error response in POML format
            error_response = MemoryNode(
                identity={
                    "name": "InjectorAgent",
                    "version": "1.0",
                    "type": "Specialized Data Injection Agent"
                },
                operational_context={
                    "project": "External Context Engine (ECE) v3.0",
                    "objective": "Inject data into the Neo4j knowledge graph."
                },
                directive={
                    "goal": "Provide status of memory linking operation.",
                    "task": {
                        "name": "LinkMemoryToTimeNode",
                        "steps": [
                            "Receive memory node ID and timestamp from Archivist",
                            "Link memory node to temporal node",
                            "Return operation status"
                        ]
                    }
                },
                node_data={
                    "success": False,
                    "error": error_msg
                },
                node_type="LinkMemoryError"
            )
            return error_response.dict()
    except HTTPException:
        # Re-raise HTTP exceptions directly
        raise
    except Exception as e:
        logger.error(f"Error processing memory link request: {str(e)}", exc_info=True)
        # Create an error response in POML format
        error_response = MemoryNode(
            identity={
                "name": "InjectorAgent",
                "version": "1.0",
                "type": "Specialized Data Injection Agent"
            },
            operational_context={
                "project": "External Context Engine (ECE) v3.0",
                "objective": "Inject data into the Neo4j knowledge graph."
            },
            directive={
                "goal": "Provide status of memory linking operation.",
                "task": {
                    "name": "LinkMemoryToTimeNode",
                    "steps": [
                        "Receive memory node ID and timestamp from Archivist",
                        "Link memory node to temporal node",
                        "Return operation status"
                    ]
                }
            },
            node_data={
                "success": False,
                "error": str(e)
            },
            node_type="LinkMemoryError"
        )
        return error_response.dict()

@app.on_event("startup")
async def startup_event():
    """Initialize UTCP Client and register Injector tools on startup."""
    # Initialize UTCP Client for tool registration
    utcp_registry_url = os.getenv("UTCP_REGISTRY_URL", "http://utcp-registry:8005")
    app.state.utcp_client = UTCPClient(utcp_registry_url)
    
    # Register Injector tools with UTCP Registry
    await _register_injector_tools(app.state.utcp_client)

async def _register_injector_tools(utcp_client: UTCPClient):
    """Register Injector tools with the UTCP Registry."""
    try:
        # Register injector.data_to_inject tool
        data_to_inject_tool = ToolDefinition(
            id="injector.data_to_inject",
            name="Data to Inject",
            description="Inject structured data into the Neo4j knowledge graph",
            category="storage",
            parameters={
                "type": "object",
                "properties": {
                    "entities": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "type": {"type": "string"},
                                "properties": {"type": "object"}
                            }
                        }
                    },
                    "relationships": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "type": {"type": "string"},
                                "start_id": {"type": "string"},
                                "end_id": {"type": "string"},
                                "start_type": {"type": "string"},
                                "end_type": {"type": "string"},
                                "properties": {"type": "object"}
                            }
                        }
                    },
                    "summary": {
                        "type": "string",
                        "description": "Summary of the data to inject"
                    }
                }
            },
            returns={
                "type": "object",
                "properties": {
                    "success": {
                        "type": "boolean",
                        "description": "Whether the injection was successful"
                    },
                    "memory_node_id": {
                        "type": "integer",
                        "description": "ID of the memory node created"
                    },
                    "error": {
                        "type": "string",
                        "description": "Error message if injection failed"
                    }
                }
            },
            endpoint="http://injector:8004/internal/data_to_inject",
            version="1.0.0",
            agent="Injector"
        )
        
        success = await utcp_client.register_tool(data_to_inject_tool)
        if success:
            logger.info("✅ Registered injector.data_to_inject tool with UTCP Registry")
        else:
            logger.error("❌ Failed to register injector.data_to_inject tool with UTCP Registry")
            
        # Register injector.get_or_create_timenode tool
        get_or_create_timenode_tool = ToolDefinition(
            id="injector.get_or_create_timenode",
            name="Get or Create Timenode",
            description="Create a chronological tree of nodes",
            category="storage",
            parameters={
                "type": "object",
                "properties": {
                    "timestamp": {
                        "type": "string",
                        "description": "The timestamp to create the chronological tree for"
                    }
                },
                "required": ["timestamp"]
            },
            returns={
                "type": "object",
                "properties": {
                    "success": {
                        "type": "boolean",
                        "description": "Whether the operation was successful"
                    },
                    "time_node": {
                        "type": "object",
                        "properties": {
                            "year_id": {"type": "string"},
                            "month_id": {"type": "string"},
                            "day_id": {"type": "string"}
                        }
                    },
                    "error": {
                        "type": "string",
                        "description": "Error message if operation failed"
                    }
                }
            },
            endpoint="http://injector:8004/internal/temporal/get_or_create_timenode",
            version="1.0.0",
            agent="Injector"
        )
        
        success = await utcp_client.register_tool(get_or_create_timenode_tool)
        if success:
            logger.info("✅ Registered injector.get_or_create_timenode tool with UTCP Registry")
        else:
            logger.error("❌ Failed to register injector.get_or_create_timenode tool with UTCP Registry")
            
        # Register injector.link_memory_to_timenode tool
        link_memory_to_timenode_tool = ToolDefinition(
            id="injector.link_memory_to_timenode",
            name="Link Memory to Timenode",
            description="Link a memory node to a temporal node",
            category="storage",
            parameters={
                "type": "object",
                "properties": {
                    "memory_node_id": {
                        "type": "integer",
                        "description": "The ID of the memory node to link"
                    },
                    "timestamp": {
                        "type": "string",
                        "description": "The timestamp to link the memory to"
                    }
                },
                "required": ["memory_node_id", "timestamp"]
            },
            returns={
                "type": "object",
                "properties": {
                    "success": {
                        "type": "boolean",
                        "description": "Whether the linking was successful"
                    },
                    "error": {
                        "type": "string",
                        "description": "Error message if linking failed"
                    }
                }
            },
            endpoint="http://injector:8004/internal/temporal/link_memory_to_timenode",
            version="1.0.0",
            agent="Injector"
        )
        
        success = await utcp_client.register_tool(link_memory_to_timenode_tool)
        if success:
            logger.info("✅ Registered injector.link_memory_to_timenode tool with UTCP Registry")
        else:
            logger.error("❌ Failed to register injector.link_memory_to_timenode tool with UTCP Registry")
            
    except Exception as e:
        logger.error(f"❌ Error registering Injector tools with UTCP Registry: {e}")

# Cleanup on shutdown
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown."""
    injector_agent.neo4j_manager.disconnect()

if __name__ == "__main__":
    uvicorn.run(
        "injector_app:app",
        host="0.0.0.0",
        port=8004,
        reload=True,
        log_level="info"
    )