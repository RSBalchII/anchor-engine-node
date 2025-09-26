from typing import Dict, List, Optional, Tuple, Any
from utcp_registry.models.tool import ToolDefinition
import logging

logger = logging.getLogger(__name__)


class UTCPRegistryService:
    """
    Service class for managing the UTCP tool registry.
    In a real implementation, this would connect to a database,
    but for this MVP we'll use an in-memory store.
    """
    
    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}
        logger.info("UTCP Registry Service initialized")
    
    async def register_tool(self, tool: ToolDefinition) -> bool:
        """
        Register a new tool in the registry.
        
        Args:
            tool: ToolDefinition to register
            
        Returns:
            bool: True if registration was successful, False otherwise
        """
        try:
            self._tools[tool.id] = tool
            logger.info(f"Tool {tool.id} registered successfully")
            return True
        except Exception as e:
            logger.error(f"Error registering tool {tool.id}: {str(e)}")
            return False
    
    async def get_tool(self, tool_id: str) -> Optional[ToolDefinition]:
        """
        Retrieve a tool by its ID.
        
        Args:
            tool_id: The ID of the tool to retrieve
            
        Returns:
            ToolDefinition if found, None otherwise
        """
        return self._tools.get(tool_id)
    
    async def list_tools(self) -> List[ToolDefinition]:
        """
        List all registered tools.
        
        Returns:
            List of all registered ToolDefinitions
        """
        return list(self._tools.values())
    
    async def list_tools_by_agent(self, agent_name: str) -> List[ToolDefinition]:
        """
        List all tools provided by a specific agent.
        
        Args:
            agent_name: Name of the agent
            
        Returns:
            List of ToolDefinitions for the specified agent
        """
        return [tool for tool in self._tools.values() if tool.agent == agent_name]
    
    async def list_tools_by_category(self, category: str) -> List[ToolDefinition]:
        """
        List all tools in a specific category.
        
        Args:
            category: Category of the tools
            
        Returns:
            List of ToolDefinitions in the specified category
        """
        return [tool for tool in self._tools.values() if tool.category == category]
    
    async def update_tool(self, tool_id: str, updates: Dict) -> bool:
        """
        Update an existing tool in the registry.
        
        Args:
            tool_id: ID of the tool to update
            updates: Dictionary of fields to update
            
        Returns:
            bool: True if update was successful, False otherwise
        """
        if tool_id not in self._tools:
            return False
        
        try:
            existing_tool = self._tools[tool_id]
            update_data = existing_tool.model_dump()
            update_data.update(updates)
            # Update the timestamp
            update_data['updated_at'] = __import__('datetime').datetime.now()
            
            # Create updated tool definition
            updated_tool = ToolDefinition(**update_data)
            self._tools[tool_id] = updated_tool
            logger.info(f"Tool {tool_id} updated successfully")
            return True
        except Exception as e:
            logger.error(f"Error updating tool {tool_id}: {str(e)}")
            return False
    
    async def delete_tool(self, tool_id: str) -> bool:
        """
        Remove a tool from the registry.
        
        Args:
            tool_id: ID of the tool to remove
            
        Returns:
            bool: True if deletion was successful, False otherwise
        """
        if tool_id in self._tools:
            del self._tools[tool_id]
            logger.info(f"Tool {tool_id} deleted successfully")
            return True
        return False
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check on the registry.
        
        Returns:
            Health check status information
        """
        return {
            "status": "healthy",
            "tool_count": len(self._tools),
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }