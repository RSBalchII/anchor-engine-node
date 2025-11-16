"""
Security utilities for Anchor MCP tools.
Implements shell command whitelisting and path traversal protection.
"""
import os
import subprocess
from pathlib import Path
from typing import Tuple, Optional, List
from dotenv import load_dotenv

load_dotenv()

# ============================================================================
# SHELL COMMAND WHITELIST
# ============================================================================

class ShellSecurity:
    """Security controls for shell command execution."""
    
    def __init__(self):
        self.whitelist_enabled = os.getenv("SHELL_WHITELIST_ENABLED", "true").lower() == "true"
        allowed = os.getenv("SHELL_ALLOWED_COMMANDS", "ls,dir,pwd,cd,cat,head,tail,grep,find,echo,python,node,npm,git,curl,wget")
        self.allowed_commands = set(cmd.strip() for cmd in allowed.split(","))
        self.execution_timeout = int(os.getenv("SHELL_EXECUTION_TIMEOUT", "30"))
        self.max_output_size = int(os.getenv("SHELL_MAX_OUTPUT_SIZE", "10000"))
    
    def validate_command(self, command: str) -> Tuple[bool, Optional[str]]:
        """
        Validate a shell command against whitelist.
        Returns (is_valid, error_message)
        """
        if not self.whitelist_enabled:
            return True, None
        
        # Extract base command (first word)
        base_command = command.strip().split()[0] if command.strip() else ""
        
        # Check against whitelist
        if base_command not in self.allowed_commands:
            return False, f"Command '{base_command}' not in whitelist. Allowed: {', '.join(sorted(self.allowed_commands))}"
        
        # Check for dangerous patterns
        dangerous_patterns = [
            "rm -rf /",
            ":(){ :|:& };:",  # Fork bomb
            "dd if=/dev/zero",
            "mkfs",
            "format",
        ]
        
        for pattern in dangerous_patterns:
            if pattern in command:
                return False, f"Dangerous pattern detected: {pattern}"
        
        return True, None
    
    def execute_safe(self, command: str, timeout: Optional[int] = None) -> dict:
        """
        Execute command with safety checks.
        Returns dict with result or error.
        """
        # Validate command
        is_valid, error_msg = self.validate_command(command)
        if not is_valid:
            return {"error": error_msg, "command": command, "blocked": True}
        
        # Use configured timeout
        timeout = timeout or self.execution_timeout
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=os.getcwd()
            )
            
            # Truncate output
            stdout = result.stdout[:self.max_output_size]
            stderr = result.stderr[:self.max_output_size]
            
            if len(result.stdout) > self.max_output_size:
                stdout += f"\n... (truncated {len(result.stdout) - self.max_output_size} bytes)"
            
            return {
                "command": command,
                "returncode": result.returncode,
                "stdout": stdout,
                "stderr": stderr,
                "success": result.returncode == 0
            }
        except subprocess.TimeoutExpired:
            return {"error": f"Command timed out after {timeout}s", "command": command}
        except Exception as e:
            return {"error": str(e), "command": command}

# ============================================================================
# FILESYSTEM PATH PROTECTION
# ============================================================================

class FilesystemSecurity:
    """Security controls for filesystem operations."""
    
    def __init__(self):
        allowed = os.getenv("FILESYSTEM_ALLOWED_PATHS", "")
        denied = os.getenv("FILESYSTEM_DENY_PATHS", "")
        
        self.allowed_paths = [Path(p.strip()) for p in allowed.split(",") if p.strip()]
        self.denied_paths = [Path(p.strip()) for p in denied.split(",") if p.strip()]
        self.allow_traversal = os.getenv("FILESYSTEM_ALLOW_TRAVERSAL", "false").lower() == "true"
        self.write_allowed_exts = [
            ext.strip() for ext in os.getenv(
                "FILESYSTEM_WRITE_ALLOWED_EXTS",
                ".txt,.md,.py,.json,.yaml,.yml,.ini,.cfg,.toml,.csv"
            ).split(",") if ext.strip()
        ]
        self.max_write_size = int(os.getenv("FILESYSTEM_MAX_WRITE_SIZE", "200000"))
    
    def validate_path(self, path: str) -> Tuple[bool, Optional[str]]:
        """
        Validate a filesystem path against security rules.
        Returns (is_valid, error_message)
        """
        try:
            p = Path(path).resolve()
            
            # Check for path traversal if disabled
            if not self.allow_traversal and ".." in path:
                return False, "Path traversal (..) not allowed"
            
            # Check denied paths first (takes precedence)
            for denied in self.denied_paths:
                try:
                    denied_resolved = denied.resolve()
                    if p == denied_resolved or denied_resolved in p.parents:
                        return False, f"Access denied to path: {denied}"
                except:
                    pass
            
            # If allowed paths configured, check if path is within allowed
            if self.allowed_paths:
                is_allowed = False
                for allowed in self.allowed_paths:
                    try:
                        allowed_resolved = allowed.resolve()
                        if p == allowed_resolved or allowed_resolved in p.parents:
                            is_allowed = True
                            break
                    except:
                        pass
                
                if not is_allowed:
                    return False, f"Path not in allowed directories: {', '.join(str(p) for p in self.allowed_paths)}"
            
            return True, None
        except Exception as e:
            return False, f"Path validation error: {e}"
    
    def read_safe(self, path: str, max_size: int = 10000) -> dict:
        """
        Read file with security checks.
        Returns dict with content or error.
        """
        # Validate path
        is_valid, error_msg = self.validate_path(path)
        if not is_valid:
            return {"error": error_msg, "path": path, "blocked": True}
        
        try:
            p = Path(path)
            
            if not p.exists():
                return {"error": f"Path does not exist: {path}"}
            
            if p.is_file():
                # Read file with size limit
                with open(p, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read(max_size)
                
                file_size = p.stat().st_size
                truncated = file_size > max_size
                
                return {
                    "type": "file",
                    "path": str(p),
                    "size": file_size,
                    "content": content,
                    "truncated": truncated
                }
            else:
                # List directory
                items = []
                for item in p.iterdir():
                    items.append({
                        "name": item.name,
                        "type": "dir" if item.is_dir() else "file",
                        "size": item.stat().st_size if item.is_file() else None
                    })
                return {
                    "type": "directory",
                    "path": str(p),
                    "count": len(items),
                    "items": sorted(items, key=lambda x: (x["type"] != "dir", x["name"]))
                }
        except Exception as e:
            return {"error": str(e), "path": path}

    def write_safe(self, path: str, content: str, append: bool = False) -> dict:
        """
        Write text content to a file with security checks.
        Returns dict with status or error.
        """
        # Validate path
        is_valid, error_msg = self.validate_path(path)
        if not is_valid:
            return {"error": error_msg, "path": path, "blocked": True}
        try:
            p = Path(path)
            # Enforce allowed extensions
            if self.write_allowed_exts:
                if not any(str(p).lower().endswith(ext.lower()) for ext in self.write_allowed_exts):
                    return {"error": f"Extension not allowed for writing: {p.suffix}", "path": str(p), "blocked": True}
            # Enforce max write size
            if content is None:
                content = ""
            if len(content.encode("utf-8", errors="ignore")) > self.max_write_size:
                return {"error": f"Content exceeds max allowed size {self.max_write_size} bytes", "path": str(p)}
            # Ensure parent exists
            if not p.parent.exists():
                p.parent.mkdir(parents=True, exist_ok=True)
            # Write mode
            mode = "a" if append else "w"
            with open(p, mode, encoding="utf-8", errors="ignore") as f:
                f.write(content)
            return {
                "type": "file",
                "path": str(p),
                "action": "append" if append else "write",
                "size": p.stat().st_size,
                "success": True
            }
        except Exception as e:
            return {"error": str(e), "path": path}

# Global instances
shell_security = ShellSecurity()
filesystem_security = FilesystemSecurity()
