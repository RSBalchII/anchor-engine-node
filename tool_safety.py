"""
Tool Safety Manager (T-101)
Implements tool sandboxing and safety checks for Anchor

Features:
- Categorizes tools as SAFE or DANGEROUS
- Requires confirmation for dangerous tools
- Input sanitization for shell commands
- Configurable via .env
"""
import re
import os
import logging
from typing import List, Dict, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class ToolSafety(Enum):
    """Tool safety categories"""
    SAFE = "safe"           # Can auto-execute
    DANGEROUS = "dangerous"  # Requires confirmation
    BLOCKED = "blocked"      # Never execute


class ToolSafetyManager:
    """Manages tool execution safety and sandboxing"""
    
    def __init__(self):
        # Default safe tools (read-only operations)
        self.safe_tools = set(os.getenv(
            "SAFE_TOOLS",
            "filesystem_read,filesystem_list_directory,web_search,websearch_search_web,websearch_fetch_url"
        ).split(","))
        
        # Default dangerous tools (write/execute operations)
        self.dangerous_tools = set(os.getenv(
            "DANGEROUS_TOOLS", 
            "shell_execute,filesystem_write,filesystem_write_file"
        ).split(","))
        
        # Blocked tools (never allowed)
        self.blocked_tools = set(os.getenv(
            "BLOCKED_TOOLS",
            ""  # Empty by default
        ).split(",")) - {""}  # Remove empty string
        
        # Configuration
        self.auto_execute_enabled = os.getenv("AUTO_TOOL_EXECUTION", "true").lower() == "true"
        self.confirmation_required = os.getenv("TOOL_CONFIRMATION_REQUIRED", "false").lower() == "true"
        
        # Shell command sanitization patterns
        self.dangerous_shell_patterns = [
            r"rm\s+-rf",           # Dangerous delete
            r">(>?)\s*/dev/",      # Redirect to device
            r";\s*rm\s+",          # Chained delete
            r"\|\s*sudo",          # Piped sudo
            r"mkfs",               # Format filesystem
            r"dd\s+if=",           # Disk operations
            r"wget.*\|\s*sh",      # Download and execute
            r"wget.*\|\s*bash",    # Download and execute
            r"curl.*\|\s*sh",      # Download and execute
            r"curl.*\|\s*bash",    # Download and execute
            r"nc\s+.*-e",          # Netcat backdoor
            r"eval\s*\(",          # Code evaluation
        ]
        
        logger.info(f"Tool Safety Manager initialized:")
        logger.info(f"  Safe tools: {len(self.safe_tools)}")
        logger.info(f"  Dangerous tools: {len(self.dangerous_tools)}")
        logger.info(f"  Blocked tools: {len(self.blocked_tools)}")
        logger.info(f"  Auto-execute: {self.auto_execute_enabled}")
        logger.info(f"  Confirmation required: {self.confirmation_required}")
    
    def categorize_tool(self, tool_name: str) -> ToolSafety:
        """Categorize a tool by safety level"""
        if tool_name in self.blocked_tools:
            return ToolSafety.BLOCKED
        elif tool_name in self.dangerous_tools:
            return ToolSafety.DANGEROUS
        elif tool_name in self.safe_tools:
            return ToolSafety.SAFE
        else:
            # Unknown tools are treated as dangerous by default
            logger.warning(f"Unknown tool '{tool_name}' - treating as DANGEROUS")
            return ToolSafety.DANGEROUS
    
    def requires_confirmation(self, tool_name: str) -> bool:
        """Check if tool requires user confirmation before execution"""
        if self.confirmation_required:
            # All tools require confirmation if globally enabled
            return True
        
        category = self.categorize_tool(tool_name)
        
        if category == ToolSafety.BLOCKED:
            return True  # Will be blocked anyway
        elif category == ToolSafety.DANGEROUS:
            return True  # Always confirm dangerous tools
        else:
            return False  # Safe tools can auto-execute
    
    def is_allowed(self, tool_name: str) -> bool:
        """Check if tool is allowed to execute at all"""
        return self.categorize_tool(tool_name) != ToolSafety.BLOCKED
    
    def sanitize_shell_command(self, command: str) -> tuple[bool, Optional[str]]:
        """
        Sanitize shell command and check for dangerous patterns
        
        Returns:
            (is_safe, warning_message)
        """
        # Check for dangerous patterns
        for pattern in self.dangerous_shell_patterns:
            if re.search(pattern, command, re.IGNORECASE):
                return False, f"Dangerous pattern detected: {pattern}"
        
        # Check for suspicious characters
        if "$((" in command or "`" in command or "$(" in command:
            return False, "Command substitution detected - potentially dangerous"
        
        # Warn about file redirects
        if ">>" in command or ">" in command:
            return True, "Warning: File redirection detected (write operation)"
        
        return True, None
    
    def should_auto_execute(self, tool_name: str, parameters: Dict[str, Any]) -> bool:
        """
        Determine if tool should auto-execute or require confirmation
        
        Args:
            tool_name: Name of the tool
            parameters: Tool parameters (for additional validation)
        
        Returns:
            True if should auto-execute, False if needs confirmation
        """
        if not self.auto_execute_enabled:
            return False
        
        if not self.is_allowed(tool_name):
            return False
        
        if self.requires_confirmation(tool_name):
            return False
        
        # Additional checks for specific tools
        if tool_name == "shell_execute":
            command = parameters.get("command", "")
            is_safe, _ = self.sanitize_shell_command(command)
            return is_safe
        
        return True
    
    def get_confirmation_prompt(self, tool_name: str, parameters: Dict[str, Any]) -> str:
        """Generate confirmation prompt for tool execution"""
        category = self.categorize_tool(tool_name)
        
        prompt = f"\n⚠️  Tool Execution Request\n"
        prompt += f"Tool: {tool_name}\n"
        prompt += f"Safety: {category.value.upper()}\n"
        prompt += f"Parameters:\n"
        
        for key, value in parameters.items():
            # Truncate long values
            value_str = str(value)
            if len(value_str) > 100:
                value_str = value_str[:100] + "..."
            prompt += f"  {key}: {value_str}\n"
        
        if tool_name == "filesystem_write":
            content = parameters.get("content", "")
            preview = str(content)[:200]
            prompt += "\nPreview:\n"
            prompt += preview + ("..." if len(str(content)) > 200 else "") + "\n"
            prompt += f"Length: {len(str(content))} chars\n"

        # Add specific warnings
        if tool_name == "shell_execute":
            command = parameters.get("command", "")
            is_safe, warning = self.sanitize_shell_command(command)
            if not is_safe:
                prompt += f"\n🚨 DANGER: {warning}\n"
            elif warning:
                prompt += f"\n⚠️  {warning}\n"
        
        prompt += "\nExecute this tool? (y/n): "
        return prompt
    
    def log_tool_execution(self, tool_name: str, parameters: Dict[str, Any], allowed: bool):
        """Log tool execution attempt for audit trail"""
        logger.info(f"Tool execution: {tool_name}")
        logger.info(f"  Allowed: {allowed}")
        logger.info(f"  Category: {self.categorize_tool(tool_name).value}")
        logger.debug(f"  Parameters: {parameters}")


# Global instance
_safety_manager: Optional[ToolSafetyManager] = None


def get_safety_manager() -> ToolSafetyManager:
    """Get global ToolSafetyManager instance"""
    global _safety_manager
    if _safety_manager is None:
        _safety_manager = ToolSafetyManager()
    return _safety_manager


# Convenience functions
def is_tool_safe(tool_name: str) -> bool:
    """Check if tool is categorized as safe"""
    return get_safety_manager().categorize_tool(tool_name) == ToolSafety.SAFE


def requires_confirmation(tool_name: str) -> bool:
    """Check if tool requires confirmation"""
    return get_safety_manager().requires_confirmation(tool_name)


def sanitize_command(command: str) -> tuple[bool, Optional[str]]:
    """Sanitize shell command"""
    return get_safety_manager().sanitize_shell_command(command)
