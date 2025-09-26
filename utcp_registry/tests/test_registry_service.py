import pytest
import asyncio
from datetime import datetime
from utcp_registry.services.registry import UTCPRegistryService
from utcp_registry.models.tool import ToolDefinition


@pytest.fixture
def registry_service():
    """Create a fresh registry service instance for each test."""
    return UTCPRegistryService()


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
async def test_register_tool_success(registry_service, sample_tool):
    """Test successful tool registration."""
    result = await registry_service.register_tool(sample_tool)
    assert result is True
    
    # Verify the tool was stored
    retrieved_tool = await registry_service.get_tool(sample_tool.id)
    assert retrieved_tool is not None
    assert retrieved_tool.id == sample_tool.id
    assert retrieved_tool.name == sample_tool.name


@pytest.mark.asyncio
async def test_get_tool_success(registry_service, sample_tool):
    """Test getting a registered tool."""
    await registry_service.register_tool(sample_tool)
    
    result = await registry_service.get_tool(sample_tool.id)
    assert result is not None
    assert result.id == sample_tool.id
    assert result.name == sample_tool.name


@pytest.mark.asyncio
async def test_get_tool_not_found(registry_service):
    """Test getting a non-existent tool."""
    result = await registry_service.get_tool("nonexistent.tool")
    assert result is None


@pytest.mark.asyncio
async def test_list_tools_empty(registry_service):
    """Test listing tools when registry is empty."""
    result = await registry_service.list_tools()
    assert result == []


@pytest.mark.asyncio
async def test_list_tools_with_data(registry_service, sample_tool):
    """Test listing tools with registered data."""
    await registry_service.register_tool(sample_tool)
    
    result = await registry_service.list_tools()
    assert len(result) == 1
    assert result[0].id == sample_tool.id


@pytest.mark.asyncio
async def test_list_tools_by_agent(registry_service):
    """Test listing tools by agent."""
    tool1 = ToolDefinition(
        id="agent1.func1",
        name="Tool 1",
        description="First tool",
        category="test",
        parameters={},
        returns={},
        endpoint="http://test1.com",
        version="1.0.0",
        agent="Agent1"
    )
    
    tool2 = ToolDefinition(
        id="agent2.func1",
        name="Tool 2",
        description="Second tool",
        category="test",
        parameters={},
        returns={},
        endpoint="http://test2.com",
        version="1.0.0",
        agent="Agent2"
    )
    
    await registry_service.register_tool(tool1)
    await registry_service.register_tool(tool2)
    
    agent1_tools = await registry_service.list_tools_by_agent("Agent1")
    agent2_tools = await registry_service.list_tools_by_agent("Agent2")
    
    assert len(agent1_tools) == 1
    assert len(agent2_tools) == 1
    assert agent1_tools[0].id == tool1.id
    assert agent2_tools[0].id == tool2.id


@pytest.mark.asyncio
async def test_list_tools_by_category(registry_service):
    """Test listing tools by category."""
    tool1 = ToolDefinition(
        id="agent1.func1",
        name="Tool 1",
        description="First tool",
        category="data_processing",
        parameters={},
        returns={},
        endpoint="http://test1.com",
        version="1.0.0",
        agent="Agent1"
    )
    
    tool2 = ToolDefinition(
        id="agent1.func2",
        name="Tool 2",
        description="Second tool",
        category="retrieval",
        parameters={},
        returns={},
        endpoint="http://test2.com",
        version="1.0.0",
        agent="Agent1"
    )
    
    await registry_service.register_tool(tool1)
    await registry_service.register_tool(tool2)
    
    processing_tools = await registry_service.list_tools_by_category("data_processing")
    retrieval_tools = await registry_service.list_tools_by_category("retrieval")
    
    assert len(processing_tools) == 1
    assert len(retrieval_tools) == 1
    assert processing_tools[0].id == tool1.id
    assert retrieval_tools[0].id == tool2.id


@pytest.mark.asyncio
async def test_update_tool_success(registry_service, sample_tool):
    """Test updating an existing tool."""
    await registry_service.register_tool(sample_tool)
    
    updates = {
        "name": "Updated Tool Name",
        "description": "Updated description"
    }
    
    result = await registry_service.update_tool(sample_tool.id, updates)
    assert result is True
    
    updated_tool = await registry_service.get_tool(sample_tool.id)
    assert updated_tool.name == "Updated Tool Name"
    assert updated_tool.description == "Updated description"
    assert updated_tool.category == sample_tool.category  # Should remain unchanged


@pytest.mark.asyncio
async def test_update_tool_not_found(registry_service):
    """Test updating a non-existent tool."""
    updates = {"name": "New Name"}
    result = await registry_service.update_tool("nonexistent.tool", updates)
    assert result is False


@pytest.mark.asyncio
async def test_delete_tool_success(registry_service, sample_tool):
    """Test deleting an existing tool."""
    await registry_service.register_tool(sample_tool)
    
    result = await registry_service.delete_tool(sample_tool.id)
    assert result is True
    
    # Verify tool is gone
    deleted_tool = await registry_service.get_tool(sample_tool.id)
    assert deleted_tool is None


@pytest.mark.asyncio
async def test_delete_tool_not_found(registry_service):
    """Test deleting a non-existent tool."""
    result = await registry_service.delete_tool("nonexistent.tool")
    assert result is False


@pytest.mark.asyncio
async def test_health_check(registry_service, sample_tool):
    """Test health check functionality."""
    await registry_service.register_tool(sample_tool)
    
    health_status = await registry_service.health_check()
    
    assert health_status["status"] == "healthy"
    assert health_status["tool_count"] == 1
    assert "timestamp" in health_status