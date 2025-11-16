"""
Tool Execution Manager (Copilot CLI Pattern)
Implements the GitHub Copilot CLI tool approval flow:
1. Model emits tool_use block
2. CLI shows proposed tool call
3. User approves/denies
4. Tool executes (if approved)
5. tool_result returned to model

Based on: github/copilot-cli architecture
"""
import logging
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum

from tool_safety import get_safety_manager, ToolSafety

logger = logging.getLogger(__name__)


class ToolExecutionStatus(Enum):
    """Status of tool execution request"""
    PENDING = "pending"      # Awaiting user approval
    APPROVED = "approved"    # User approved, ready to execute
    DENIED = "denied"        # User denied
    EXECUTED = "executed"    # Successfully executed
    FAILED = "failed"        # Execution failed
    ORPHANED = "orphaned"    # No tool_result paired with tool_use


@dataclass
class ToolCall:
    """Represents a tool call request from the model"""
    tool_name: str
    parameters: Dict[str, Any]
    call_id: str  # Unique ID to pair tool_use with tool_result
    status: ToolExecutionStatus = ToolExecutionStatus.PENDING
    result: Optional[Any] = None
    error: Optional[str] = None
    
    def to_tool_use_block(self) -> Dict[str, Any]:
        """Convert to tool_use message block for model"""
        return {
            "type": "tool_use",
            "id": self.call_id,
            "name": self.tool_name,
            "input": self.parameters
        }
    
    def to_tool_result_block(self) -> Dict[str, Any]:
        """Convert to tool_result message block for model"""
        if self.status == ToolExecutionStatus.DENIED:
            return {
                "type": "tool_result",
                "tool_use_id": self.call_id,
                "is_error": True,
                "content": "Tool execution denied by user"
            }
        elif self.status == ToolExecutionStatus.FAILED:
            return {
                "type": "tool_result",
                "tool_use_id": self.call_id,
                "is_error": True,
                "content": self.error or "Tool execution failed"
            }
        else:
            return {
                "type": "tool_result",
                "tool_use_id": self.call_id,
                "content": self.result
            }


class ToolExecutionManager:
    """
    Manages tool execution with Copilot CLI pattern:
    - Parses tool_use blocks from model output
    - Presents tool calls for user approval
    - Executes approved tools
    - Returns tool_result blocks to model
    """
    
    def __init__(self):
        self.safety_manager = get_safety_manager()
        self.pending_calls: List[ToolCall] = []
        self.parallel_execution_enabled = True  # Can be disabled via flag
        
    def parse_tool_use_from_response(self, model_output: str) -> List[ToolCall]:
        """
        Parse tool_use blocks from model response
        
        Expected format (examples):
        1. Simple: TOOL_CALL: tool_name(arg1="value1", arg2="value2")
        2. JSON: {"tool_use": {"name": "tool_name", "input": {...}}}
        3. Anthropic-style: <tool_use>...</tool_use>
        
        Returns list of ToolCall objects
        """
        tool_calls = []
        
        # Pattern 1: TOOL_CALL: syntax (simple)
        if "TOOL_CALL:" in model_output:
            # Parse simple tool call format
            import re
            pattern = r'TOOL_CALL:\s*(\w+)\((.*?)\)'
            matches = re.findall(pattern, model_output, re.DOTALL)
            
            for i, (tool_name, args_str) in enumerate(matches):
                try:
                    # Parse arguments
                    params = self._parse_tool_arguments(args_str)
                    call_id = f"call_{tool_name}_{i}"
                    
                    tool_calls.append(ToolCall(
                        tool_name=tool_name,
                        parameters=params,
                        call_id=call_id
                    ))
                except Exception as e:
                    logger.warning(f"Failed to parse tool call: {e}")
        
        # Pattern 2: JSON blocks
        try:
            # Look for JSON tool_use blocks
            json_match = re.search(r'\{.*"tool_use".*\}', model_output, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(0))
                if "tool_use" in data:
                    tool_use = data["tool_use"]
                    tool_calls.append(ToolCall(
                        tool_name=tool_use["name"],
                        parameters=tool_use.get("input", {}),
                        call_id=tool_use.get("id", f"call_{len(tool_calls)}")
                    ))
        except Exception as e:
            logger.debug(f"No JSON tool_use found: {e}")
        
        return tool_calls
    
    def _parse_tool_arguments(self, args_str: str) -> Dict[str, Any]:
        """Parse tool arguments from string format"""
        params = {}
        
        # Simple key=value parsing
        import re
        arg_pattern = r'(\w+)=(["\'])(.*?)\2'
        matches = re.findall(arg_pattern, args_str)
        
        for key, _, value in matches:
            params[key] = value
        
        return params
    
    def present_tool_call_for_approval(self, tool_call: ToolCall) -> str:
        """
        Generate approval prompt for tool call
        Mimics Copilot CLI's tool preview UI
        """
        safety = self.safety_manager.categorize_tool(tool_call.tool_name)
        
        # Build approval prompt
        prompt = "\n" + "─" * 60 + "\n"
        prompt += f"🔧 Tool Call Request\n"
        prompt += "─" * 60 + "\n"
        
        # Tool info
        prompt += f"Tool: {tool_call.tool_name}\n"
        prompt += f"Safety: {safety.value.upper()}\n"
        prompt += f"ID: {tool_call.call_id}\n"
        
        # Parameters
        prompt += "\nParameters:\n"
        for key, value in tool_call.parameters.items():
            # Truncate long values
            value_str = str(value)
            if len(value_str) > 100:
                value_str = value_str[:100] + "..."
            prompt += f"  • {key}: {value_str}\n"
        
        # Safety warnings
        if safety == ToolSafety.DANGEROUS:
            prompt += "\n⚠️  WARNING: This tool performs dangerous operations\n"
            
            # Special handling for shell commands
            if tool_call.tool_name == "shell_execute":
                command = tool_call.parameters.get("command", "")
                is_safe, warning = self.safety_manager.sanitize_shell_command(command)
                
                if not is_safe:
                    prompt += f"🚨 DANGER: {warning}\n"
                elif warning:
                    prompt += f"⚠️  {warning}\n"
        
        prompt += "\n" + "─" * 60 + "\n"
        prompt += "Approve this tool call? [y/n/a=allow all]: "
        
        return prompt
    
    def approve_tool_call(self, tool_call: ToolCall, approved: bool):
        """Mark tool call as approved or denied"""
        if approved:
            tool_call.status = ToolExecutionStatus.APPROVED
            logger.info(f"Tool call approved: {tool_call.tool_name}")
        else:
            tool_call.status = ToolExecutionStatus.DENIED
            logger.info(f"Tool call denied: {tool_call.tool_name}")
        
        # Log for audit trail
        self.safety_manager.log_tool_execution(
            tool_call.tool_name,
            tool_call.parameters,
            approved
        )
    
    async def execute_tool_call(self, tool_call: ToolCall, mcp_client=None) -> ToolCall:
        """
        Execute approved tool call
        
        Args:
            tool_call: The ToolCall to execute
            mcp_client: Optional MCP client for calling MCP tools
        
        Returns:
            Updated ToolCall with result or error
        """
        if tool_call.status != ToolExecutionStatus.APPROVED:
            tool_call.error = "Tool call not approved"
            tool_call.status = ToolExecutionStatus.FAILED
            return tool_call
        
        try:
            logger.info(f"Executing tool: {tool_call.tool_name}")
            
            # Check if tool is allowed
            if not self.safety_manager.is_allowed(tool_call.tool_name):
                tool_call.error = f"Tool '{tool_call.tool_name}' is blocked"
                tool_call.status = ToolExecutionStatus.FAILED
                return tool_call
            
            # Execute via MCP client if available
            if mcp_client:
                result = await self._execute_via_mcp(tool_call, mcp_client)
            else:
                # Fallback: try local execution
                result = await self._execute_local_tool(tool_call)
            
            tool_call.result = result
            tool_call.status = ToolExecutionStatus.EXECUTED
            logger.info(f"Tool executed successfully: {tool_call.tool_name}")
            
        except Exception as e:
            logger.error(f"Tool execution failed: {e}")
            tool_call.error = str(e)
            tool_call.status = ToolExecutionStatus.FAILED
        
        return tool_call
    
    async def _execute_via_mcp(self, tool_call: ToolCall, mcp_client) -> Any:
        """Execute tool via MCP server"""
        # Call MCP server endpoint
        response = await mcp_client.call_tool(
            tool_call.tool_name,
            tool_call.parameters
        )
        return response
    
    async def _execute_local_tool(self, tool_call: ToolCall) -> Any:
        """Execute tool locally (fallback)"""
        # This would implement local tool execution
        # For now, raise error
        raise NotImplementedError(f"Local execution not implemented for {tool_call.tool_name}")
    
    def get_orphaned_tool_calls(self) -> List[ToolCall]:
        """Get tool calls that have no paired tool_result"""
        return [tc for tc in self.pending_calls if tc.status == ToolExecutionStatus.PENDING]
    
    def cleanup_orphaned_calls(self):
        """Mark orphaned tool calls as such (on session abort)"""
        for tc in self.get_orphaned_tool_calls():
            tc.status = ToolExecutionStatus.ORPHANED
            logger.warning(f"Orphaned tool call cleaned up: {tc.call_id}")


# Global instance
_execution_manager: Optional[ToolExecutionManager] = None


def get_execution_manager() -> ToolExecutionManager:
    """Get global ToolExecutionManager instance"""
    global _execution_manager
    if _execution_manager is None:
        _execution_manager = ToolExecutionManager()
    return _execution_manager
