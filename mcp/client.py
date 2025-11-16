"""
Simple MCP Client for Anchor
Minimal client for calling MCP tools from simple tool mode
"""
import httpx
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class MCPClient:
    """Simple MCP client for tool calls"""
    
    def __init__(self, base_url: str = "http://localhost:8008"):
        self.base_url = base_url.rstrip('/')
        self.timeout = 30
    
    async def call_tool(self, tool_name: str, **kwargs) -> Any:
        """
        Call an MCP tool.
        
        Args:
            tool_name: Name of the tool to call
            **kwargs: Tool parameters
            
        Returns:
            Tool result
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/mcp/call",
                    json={
                        "name": tool_name,
                        "arguments": kwargs
                    }
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    error_detail = response.text[:200]
                    logger.error(f"Tool call failed: HTTP {response.status_code} - {error_detail}")
                    return {
                        "error": f"HTTP {response.status_code}",
                        "detail": error_detail
                    }
            
            except httpx.TimeoutException:
                logger.error(f"Tool call timed out: {tool_name}")
                return {"error": "Timeout", "detail": f"Tool '{tool_name}' timed out after {self.timeout}s"}
            
            except Exception as e:
                logger.error(f"Tool call error: {e}")
                return {"error": str(type(e).__name__), "detail": str(e)}
    
    async def get_tools(self) -> List[Dict[str, Any]]:
        """
        Get list of available tools.
        
        Returns:
            List of tool schemas
        """
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                response = await client.get(f"{self.base_url}/mcp/tools")
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("tools", [])
                else:
                    logger.error(f"Failed to get tools: HTTP {response.status_code}")
                    return []
            
            except Exception as e:
                logger.error(f"Error getting tools: {e}")
                return []
