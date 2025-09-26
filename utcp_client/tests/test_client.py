import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from utcp_client.client import UTCPClient
from utcp_registry.models.tool import ToolDefinition


@pytest.fixture
def sample_tool():
    """Create a sample tool definition for testing."""
    return ToolDefinition(
        id="test.agent.function_name",
        name="Test Tool",
        description="A test tool for validation",
        category="test",
        parameters={
            "type": "object",
            "properties": {
                "input": {
                    "type": "string",
                    "description": "Input parameter"
                }
            },
            "required": ["input"]
        },
        returns={
            "type": "object",
            "properties": {
                "result": {
                    "type": "string",
                    "description": "Result of the operation"
                }
            }
        },
        endpoint="http://test.example.com/api/test",
        version="1.0.0",
        agent="TestAgent"
    )


@pytest.mark.asyncio
async def test_init_client():
    """Test initializing the UTCP client."""
    client = UTCPClient("http://registry.example.com")
    assert client.registry_url == "http://registry.example.com"
    assert client.client is not None


@pytest.mark.asyncio
async def test_discover_tool_success(sample_tool):
    """Test successful tool discovery."""
    client = UTCPClient("http://registry.example.com")
    
    # Mock the HTTP response - using MagicMock for sync response methods
    with patch.object(client.client, 'get') as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = sample_tool.model_dump()
        mock_get.return_value = mock_response
        
        result = await client.discover_tool(sample_tool.id)
        
        assert result is not None
        assert result.id == sample_tool.id
        assert result.name == sample_tool.name
        mock_get.assert_called_once_with(f"http://registry.example.com/tools/{sample_tool.id}")


@pytest.mark.asyncio
async def test_discover_tool_not_found():
    """Test discovering a non-existent tool."""
    client = UTCPClient("http://registry.example.com")
    
    # Mock the HTTP response
    with patch.object(client.client, 'get') as mock_get:
        mock_response = AsyncMock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        
        result = await client.discover_tool("nonexistent.tool")
        
        assert result is None


@pytest.mark.asyncio
async def test_discover_tool_error():
    """Test error during tool discovery."""
    client = UTCPClient("http://registry.example.com")
    
    # Mock the HTTP response with an error
    with patch.object(client.client, 'get') as mock_get:
        mock_get.side_effect = httpx.RequestError("Connection error")
        
        result = await client.discover_tool("some.tool")
        
        assert result is None


@pytest.mark.asyncio
async def test_discover_tools_by_agent_success(sample_tool):
    """Test successful discovery of tools by agent."""
    client = UTCPClient("http://registry.example.com")
    
    # Mock the HTTP response - using MagicMock for sync response methods
    with patch.object(client.client, 'get') as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [sample_tool.model_dump()]
        mock_get.return_value = mock_response
        
        result = await client.discover_tools_by_agent("TestAgent")
        
        assert len(result) == 1
        assert result[0].id == sample_tool.id
        mock_get.assert_called_once_with("http://registry.example.com/tools/agent/TestAgent")


@pytest.mark.asyncio
async def test_discover_tools_by_agent_error():
    """Test error during tool discovery by agent."""
    client = UTCPClient("http://registry.example.com")
    
    # Mock the HTTP response with an error
    with patch.object(client.client, 'get') as mock_get:
        mock_get.side_effect = httpx.RequestError("Connection error")
        
        result = await client.discover_tools_by_agent("TestAgent")
        
        assert result == []


@pytest.mark.asyncio
async def test_discover_tools_by_category_success(sample_tool):
    """Test successful discovery of tools by category."""
    client = UTCPClient("http://registry.example.com")
    
    # Mock the HTTP response - using MagicMock for sync response methods
    with patch.object(client.client, 'get') as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [sample_tool.model_dump()]
        mock_get.return_value = mock_response
        
        result = await client.discover_tools_by_category("test")
        
        assert len(result) == 1
        assert result[0].category == "test"
        mock_get.assert_called_once_with("http://registry.example.com/tools/category/test")


@pytest.mark.asyncio
async def test_discover_tools_by_category_error():
    """Test error during tool discovery by category."""
    client = UTCPClient("http://registry.example.com")
    
    # Mock the HTTP response with an error
    with patch.object(client.client, 'get') as mock_get:
        mock_get.side_effect = httpx.RequestError("Connection error")
        
        result = await client.discover_tools_by_category("test")
        
        assert result == []


@pytest.mark.asyncio
async def test_list_all_tools_success(sample_tool):
    """Test successful listing of all tools."""
    client = UTCPClient("http://registry.example.com")
    
    # Mock the HTTP response - using MagicMock for sync response methods
    with patch.object(client.client, 'get') as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [sample_tool.model_dump()]
        mock_get.return_value = mock_response
        
        result = await client.list_all_tools()
        
        assert len(result) == 1
        assert result[0].id == sample_tool.id
        mock_get.assert_called_once_with("http://registry.example.com/tools")


@pytest.mark.asyncio
async def test_list_all_tools_error():
    """Test error during listing all tools."""
    client = UTCPClient("http://registry.example.com")
    
    # Mock the HTTP response with an error
    with patch.object(client.client, 'get') as mock_get:
        mock_get.side_effect = httpx.RequestError("Connection error")
        
        result = await client.list_all_tools()
        
        assert result == []


@pytest.mark.asyncio
async def test_call_tool_success(sample_tool):
    """Test successful tool call."""
    client = UTCPClient("http://registry.example.com")
    
    # Mock the discover_tool call to return the sample tool
    with patch.object(client, 'discover_tool', return_value=sample_tool):
        result = await client.call_tool(sample_tool.id, input="test input")
        
        assert result is not None
        assert result["tool_id"] == sample_tool.id
        assert result["parameters"]["input"] == "test input"


@pytest.mark.asyncio
async def test_call_tool_not_found():
    """Test calling a non-existent tool."""
    client = UTCPClient("http://registry.example.com")
    
    # Mock the discover_tool call to return None (not found)
    with patch.object(client, 'discover_tool', return_value=None):
        with pytest.raises(ValueError, match="Tool nonexistent.tool not found in registry"):
            await client.call_tool("nonexistent.tool", input="test input")


@pytest.mark.asyncio
async def test_register_tool_success(sample_tool):
    """Test successful tool registration."""
    client = UTCPClient("http://registry.example.com")
    
    # Mock the HTTP response
    with patch.object(client.client, 'post') as mock_post:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        result = await client.register_tool(sample_tool)
        
        assert result is True
        mock_post.assert_called_once()
        # Verify the call was made with the correct URL and data
        args, kwargs = mock_post.call_args
        assert args[0] == "http://registry.example.com/tools"
        assert "tool" in kwargs["json"]
        assert kwargs["json"]["tool"]["id"] == sample_tool.id


@pytest.mark.asyncio
async def test_register_tool_error(sample_tool):
    """Test error during tool registration."""
    client = UTCPClient("http://registry.example.com")
    
    # Mock the HTTP response with an error
    with patch.object(client.client, 'post') as mock_post:
        mock_response = AsyncMock()
        mock_response.status_code = 400
        mock_post.return_value = mock_response
        
        result = await client.register_tool(sample_tool)
        
        assert result is False


@pytest.mark.asyncio
async def test_close_client():
    """Test closing the client."""
    client = UTCPClient("http://registry.example.com")
    
    with patch.object(client.client, 'aclose') as mock_close:
        await client.close()
        mock_close.assert_called_once()