from fastapi import FastAPI, HTTPException, Depends
from typing import List, Optional
from utcp_registry.models.tool import ToolDefinition, ToolRegistrationRequest
from utcp_registry.services.registry import UTCPRegistryService
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="UTCP Tool Registry Service",
    description="Central registry for UTCP tool discovery and access",
    version="1.0.0"
)

# Initialize the registry service (in a real app, this might come from DI container)
registry_service = UTCPRegistryService()


def get_registry_service():
    """Dependency function to provide registry service instance."""
    return registry_service


@app.on_event("startup")
async def startup_event():
    """Initialize the registry service on startup."""
    logger.info("UTCP Tool Registry Service starting up")


@app.get("/")
async def root():
    """Root endpoint for health check."""
    return {"message": "UTCP Tool Registry Service is running"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    health_status = await registry_service.health_check()
    return health_status


@app.get("/tools", response_model=List[ToolDefinition])
async def get_tools_list(skip: int = 0, limit: int = 100, registry: UTCPRegistryService = Depends(get_registry_service)):
    """Get all tools with pagination."""
    tools = await registry.list_tools()
    return tools[skip:skip + limit]


@app.get("/tools/{tool_id}", response_model=ToolDefinition)
async def get_tool(tool_id: str, registry: UTCPRegistryService = Depends(get_registry_service)):
    """Get specific tool definition."""
    tool = await registry.get_tool(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool with ID '{tool_id}' not found")
    return tool


@app.get("/tools/agent/{agent_name}", response_model=List[ToolDefinition])
async def get_tools_by_agent(agent_name: str, registry: UTCPRegistryService = Depends(get_registry_service)):
    """Get all tools provided by a specific agent."""
    tools = await registry.list_tools_by_agent(agent_name)
    return tools


@app.get("/tools/category/{category}", response_model=List[ToolDefinition])
async def get_tools_by_category(category: str, registry: UTCPRegistryService = Depends(get_registry_service)):
    """Get all tools in a specific category."""
    tools = await registry.list_tools_by_category(category)
    return tools


@app.post("/tools", response_model=ToolDefinition)
async def register_tool(request: ToolRegistrationRequest, registry: UTCPRegistryService = Depends(get_registry_service)):
    """Register a new tool."""
    success = await registry.register_tool(request.tool)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to register tool")
    return request.tool


@app.put("/tools/{tool_id}", response_model=ToolDefinition)
async def update_tool(tool_id: str, request: ToolDefinition, registry: UTCPRegistryService = Depends(get_registry_service)):
    """Update an existing tool."""
    if tool_id != request.id:
        raise HTTPException(status_code=400, detail="Tool ID in URL does not match tool ID in request body")
    
    updates = request.dict()
    updates.pop('created_at', None)  # Don't allow updating creation time
    success = await registry.update_tool(tool_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail=f"Tool with ID '{tool_id}' not found")
    return await registry.get_tool(tool_id)


@app.delete("/tools/{tool_id}")
async def delete_tool(tool_id: str, registry: UTCPRegistryService = Depends(get_registry_service)):
    """Remove a tool."""
    success = await registry.delete_tool(tool_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Tool with ID '{tool_id}' not found")
    return {"message": f"Tool {tool_id} deleted successfully"}