from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime
from pydantic import field_serializer, field_validator


class ToolDefinition(BaseModel):
    """
    Model representing a tool definition in the UTCP registry.
    """
    id: str = Field(..., description="Unique identifier for the tool in format agent.function_name")
    name: str = Field(..., description="Human-readable name of the tool")
    description: str = Field(..., description="Brief description of what the tool does")
    category: str = Field(..., description="Category of the tool (e.g., data_processing, retrieval, analysis)")
    parameters: Dict[str, Any] = Field(..., description="JSON Schema for the tool parameters")
    returns: Dict[str, Any] = Field(..., description="JSON Schema for the tool response")
    endpoint: str = Field(..., description="The service endpoint where the tool is available")
    version: str = Field(..., description="Version of the tool definition")
    agent: str = Field(..., description="The agent that provides this tool")
    created_at: Optional[datetime] = Field(default_factory=datetime.now, description="Timestamp when the tool was registered")
    updated_at: Optional[datetime] = Field(default_factory=datetime.now, description="Timestamp when the tool was last updated")

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime) -> str:
        """Serialize datetime objects to ISO format strings."""
        if dt:
            return dt.isoformat()
        return None

    @field_validator('created_at', 'updated_at', mode='before')
    @classmethod
    def validate_datetime(cls, v):
        """Validate and convert datetime from ISO string if needed."""
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                # If parsing fails, return as-is to let Pydantic handle the error
                return v
        return v


class ToolRegistrationRequest(BaseModel):
    """
    Model for tool registration requests.
    """
    tool: ToolDefinition


class ToolUpdateRequest(BaseModel):
    """
    Model for tool update requests.
    """
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    returns: Optional[Dict[str, Any]] = None
    endpoint: Optional[str] = None
    version: Optional[str] = None
    agent: Optional[str] = None