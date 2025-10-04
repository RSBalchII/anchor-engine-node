import httpx
from typing import List, Dict, Any, Optional
from utcp_registry.models.tool import ToolDefinition
from pydantic import ValidationError
import logging

logger = logging.getLogger(__name__)


class UTCPClient:
    """
    UTCP (Universal Tool Calling Protocol) Client for discovering and calling tools
    via the UTCP Tool Registry service.
    """
    
    def __init__(self, registry_url: str):
        """
        Initialize the UTCP client with the registry URL.
        
        Args:
            registry_url: The base URL of the UTCP Tool Registry service
        """
        self.registry_url = registry_url.rstrip('/')
        self.client = httpx.AsyncClient(timeout=30.0)
        logger.info(f"UTCP Client initialized with registry URL: {registry_url}")
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def discover_tool(self, tool_id: str) -> Optional[ToolDefinition]:
        """
        Discover a specific tool by ID.
        
        Args:
            tool_id: The ID of the tool to discover
            
        Returns:
            ToolDefinition if found, None otherwise
        """
        try:
            response = await self.client.get(f"{self.registry_url}/tools/{tool_id}")
            
            if response.status_code == 200:
                tool_data = response.json()
                return ToolDefinition(**tool_data)
            elif response.status_code == 404:
                logger.info(f"Tool with ID '{tool_id}' not found in registry")
                return None
            else:
                logger.error(f"Error discovering tool {tool_id}: {response.status_code} - {response.text}")
                return None
        except ValidationError as e:
            logger.error(f"Validation error when parsing tool {tool_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error discovering tool {tool_id}: {e}")
            return None
    
    async def discover_tools_by_agent(self, agent_name: str) -> List[ToolDefinition]:
        """
        Discover all tools provided by a specific agent.
        
        Args:
            agent_name: Name of the agent to discover tools for
            
        Returns:
            List of ToolDefinition objects
        """
        try:
            response = await self.client.get(f"{self.registry_url}/tools/agent/{agent_name}")
            
            if response.status_code == 200:
                tools_data = response.json()
                return [ToolDefinition(**tool_data) for tool_data in tools_data]
            else:
                logger.error(f"Error discovering tools for agent {agent_name}: {response.status_code} - {response.text}")
                return []
        except ValidationError as e:
            logger.error(f"Validation error when parsing tools for agent {agent_name}: {e}")
            return []
        except Exception as e:
            logger.error(f"Error discovering tools for agent {agent_name}: {e}")
            return []
    
    async def discover_tools_by_category(self, category: str) -> List[ToolDefinition]:
        """
        Discover all tools in a specific category.
        
        Args:
            category: Category of tools to discover
            
        Returns:
            List of ToolDefinition objects
        """
        try:
            response = await self.client.get(f"{self.registry_url}/tools/category/{category}")
            
            if response.status_code == 200:
                tools_data = response.json()
                return [ToolDefinition(**tool_data) for tool_data in tools_data]
            else:
                logger.error(f"Error discovering tools in category {category}: {response.status_code} - {response.text}")
                return []
        except ValidationError as e:
            logger.error(f"Validation error when parsing tools in category {category}: {e}")
            return []
        except Exception as e:
            logger.error(f"Error discovering tools in category {category}: {e}")
            return []
    
    async def call_tool(self, tool_id: str, **kwargs) -> Any:
        """
        Call a tool by ID with the provided parameters.
        This implementation makes an actual HTTP call to the tool's endpoint.
        
        Args:
            tool_id: The ID of the tool to call
            **kwargs: Parameters to pass to the tool
            
        Returns:
            The result of the tool call
        """
        # First, discover the tool to get its endpoint
        tool_def = await self.discover_tool(tool_id)
        if not tool_def:
            logger.error(f"Cannot call tool {tool_id}: tool not found in registry")
            raise ValueError(f"Tool {tool_id} not found in registry")
        
        # Validate that the provided kwargs match the tool's parameter schema
        # For now, we'll just pass the parameters through
        # In a real implementation, you might want to validate against the parameter schema
        try:
            logger.info(f"Calling tool {tool_id} at {tool_def.endpoint} with parameters {kwargs}")
            
            # Make an HTTP call to the actual tool endpoint
            # The endpoint in the tool definition might be a full URL or need to be constructed
            # For now, we'll try to call it directly as specified
            response = await self.client.post(
                tool_def.endpoint,
                json=kwargs,
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Tool {tool_id} called successfully, result: {result}")
                return result
            else:
                logger.error(f"Error calling tool {tool_id}: {response.status_code} - {response.text}")
                raise Exception(f"Tool call failed with status {response.status_code}: {response.text}")
                
        except Exception as e:
            logger.error(f"Error calling tool {tool_id}: {e}")
            raise
    
    async def list_all_tools(self) -> List[ToolDefinition]:
        """
        List all available tools in the registry.
        
        Returns:
            List of all ToolDefinition objects in the registry
        """
        try:
            response = await self.client.get(f"{self.registry_url}/tools")
            
            if response.status_code == 200:
                tools_data = response.json()
                return [ToolDefinition(**tool_data) for tool_data in tools_data]
            else:
                logger.error(f"Error listing all tools: {response.status_code} - {response.text}")
                return []
        except ValidationError as e:
            logger.error(f"Validation error when parsing tools list: {e}")
            return []
        except Exception as e:
            logger.error(f"Error listing all tools: {e}")
            return []
    
    async def register_tool(self, tool: ToolDefinition) -> bool:
        """
        Register a tool with the UTCP registry.
        
        Args:
            tool: The ToolDefinition to register
            
        Returns:
            True if registration was successful, False otherwise
        """
        tool_id = tool.id  # Capture the tool ID before any potential error
        try:
            response = await self.client.post(
                f"{self.registry_url}/tools",
                json={"tool": tool.model_dump()}
            )
            
            if response.status_code == 200:
                logger.info(f"Tool {tool_id} registered successfully")
                return True
            else:
                logger.error(f"Error registering tool {tool_id}: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error registering tool {tool_id}: {e}")
            return False