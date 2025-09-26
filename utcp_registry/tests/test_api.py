import pytest
from fastapi.testclient import TestClient
from utcp_registry.api.main import app, get_registry_service
from utcp_registry.services.registry import UTCPRegistryService
from utcp_registry.models.tool import ToolDefinition, ToolRegistrationRequest


@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


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


def test_root_endpoint(test_client):
    """Test the root endpoint."""
    response = test_client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "UTCP Tool Registry Service is running"}


def test_health_endpoint(test_client):
    """Test the health endpoint."""
    response = test_client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"
    assert "tool_count" in data
    assert "timestamp" in data


def test_get_tools_empty(test_client):
    """Test getting all tools when registry is empty."""
    response = test_client.get("/tools")
    assert response.status_code == 200
    assert response.json() == []


def test_register_and_get_tool(test_client, sample_tool):
    """Test registering a tool and then retrieving it."""
    # Register the tool
    registration_request = ToolRegistrationRequest(tool=sample_tool)
    response = test_client.post("/tools", json=registration_request.model_dump())
    assert response.status_code == 200
    
    # Retrieve the tool
    response = test_client.get(f"/tools/{sample_tool.id}")
    assert response.status_code == 200
    
    data = response.json()
    assert data["id"] == sample_tool.id
    assert data["name"] == sample_tool.name
    assert data["agent"] == sample_tool.agent


def test_get_tool_not_found(test_client):
    """Test retrieving a non-existent tool."""
    response = test_client.get("/tools/nonexistent.tool")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_get_tools_by_agent(test_client, sample_tool):
    """Test getting tools by agent."""
    # Register the tool
    registration_request = ToolRegistrationRequest(tool=sample_tool)
    test_client.post("/tools", json=registration_request.model_dump())
    
    # Get tools by agent
    response = test_client.get(f"/tools/agent/{sample_tool.agent}")
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == sample_tool.id


def test_get_tools_by_category(test_client, sample_tool):
    """Test getting tools by category."""
    # Register the tool
    registration_request = ToolRegistrationRequest(tool=sample_tool)
    test_client.post("/tools", json=registration_request.model_dump())
    
    # Get tools by category
    response = test_client.get(f"/tools/category/{sample_tool.category}")
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == sample_tool.id


def test_update_tool(test_client, sample_tool):
    """Test updating an existing tool."""
    # Register the tool
    registration_request = ToolRegistrationRequest(tool=sample_tool)
    test_client.post("/tools", json=registration_request.model_dump())
    
    # Update the tool
    updated_tool = sample_tool.model_copy(update={
        "name": "Updated Tool Name",
        "description": "Updated description"
    })
    
    response = test_client.put(f"/tools/{sample_tool.id}", json=updated_tool.model_dump())
    assert response.status_code == 200
    
    data = response.json()
    assert data["name"] == "Updated Tool Name"
    assert data["description"] == "Updated description"


def test_update_tool_mismatch(test_client, sample_tool):
    """Test updating a tool with mismatched IDs."""
    # Register the tool
    registration_request = ToolRegistrationRequest(tool=sample_tool)
    test_client.post("/tools", json=registration_request.model_dump())
    
    # Try to update with different ID in body
    updated_tool = sample_tool.model_copy(update={
        "id": "different.id",
        "name": "Updated Tool Name"
    })
    
    response = test_client.put(f"/tools/{sample_tool.id}", json=updated_tool.model_dump())
    assert response.status_code == 400


def test_delete_tool(test_client, sample_tool):
    """Test deleting an existing tool."""
    # Register the tool
    registration_request = ToolRegistrationRequest(tool=sample_tool)
    test_client.post("/tools", json=registration_request.model_dump())
    
    # Verify it exists
    response = test_client.get(f"/tools/{sample_tool.id}")
    assert response.status_code == 200
    
    # Delete the tool
    response = test_client.delete(f"/tools/{sample_tool.id}")
    assert response.status_code == 200
    
    # Verify it's gone
    response = test_client.get(f"/tools/{sample_tool.id}")
    assert response.status_code == 404


def test_delete_tool_not_found(test_client):
    """Test deleting a non-existent tool."""
    response = test_client.delete("/tools/nonexistent.tool")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_register_tool_invalid_data(test_client):
    """Test registering a tool with invalid data."""
    # Send request with missing required fields
    invalid_request = {
        "tool": {
            "name": "Test Tool"
            # Missing required fields
        }
    }
    
    response = test_client.post("/tools", json=invalid_request)
    assert response.status_code == 422  # Validation error


def test_pagination(test_client, sample_tool):
    """Test pagination of tools list."""
    # Register multiple tools
    for i in range(5):
        tool = sample_tool.model_copy(update={
            "id": f"test.agent.function_{i}",
            "name": f"Test Tool {i}"
        })
        registration_request = ToolRegistrationRequest(tool=tool)
        test_client.post("/tools", json=registration_request.model_dump())
    
    # Test pagination with skip and limit
    response = test_client.get("/tools?skip=1&limit=3")
    assert response.status_code == 200
    data = response.json()
    assert len(data) <= 3  # Should be at most 3 items