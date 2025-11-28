"""
THIS FILE HAS BEEN ARCHIVED
The MCP security utilities have been moved to the archive to remove MCP from the active runtime.
If you need to restore the functionality, copy the files from:
    archive/removed_tool_protocols/mcp-utcp/anchor/mcp/
into this directory and restart Anchor.
"""

import os
from pathlib import Path
import subprocess
from typing import Tuple


# In test contexts we provide basic filesystem and shell security helpers so
# archived MCP tools work. In production, this module is intentionally archived
# and will raise ImportError (to avoid using archived functionality accidentally).
if os.environ.get("ANCHOR_ALLOW_ARCHIVED_MCP_TESTS", "false").lower() not in ("1", "true", "yes"):
    import os
    from pathlib import Path
    import shlex
    import subprocess
    from typing import Tuple, Any, Dict

    # To keep the repo secure in production, the MCP security utilities are archived
    # and by default cause an ImportError. For local tests, set the env var
    # ANCHOR_ALLOW_ARCHIVED_MCP_TESTS=1 to get a minimal, non-secure implementation
    # that provides the expected interfaces for the tests.
    if os.environ.get("ANCHOR_ALLOW_ARCHIVED_MCP_TESTS", "false").lower() not in ("1", "true", "yes"):
        raise ImportError("MCP security utilities archived; see archive/removed_tool_protocols/mcp-utcp/anchor/mcp/")


    class FileSystemSecurity:
        def validate_path(self, path: str) -> Tuple[bool, str]:
            p = Path(path)
            if not p.exists():
                return False, f"Path does not exist: {path}"
            return True, ""

        def read_safe(self, path: str) -> Dict[str, Any]:
            p = Path(path)
            if not p.exists():
                return {"error": f"Path not found: {path}"}
            if p.is_dir():
                entries = [str(ch) for ch in p.iterdir()]
                return {"path": str(p), "is_dir": True, "entries": entries}
            try:
                content = p.read_text(encoding="utf-8", errors="ignore")
                return {"path": str(p), "is_dir": False, "content": content}
            except Exception as e:
                return {"error": str(e)}

        def write_safe(self, path: str, content: str, append: bool = False) -> Dict[str, Any]:
            try:
                p = Path(path)
                p.parent.mkdir(parents=True, exist_ok=True)
                mode = "a" if append else "w"
                p.write_text(content, encoding="utf-8")
                return {"path": str(p), "ok": True}
            except Exception as e:
                return {"error": str(e)}


    class ShellSecurity:
        def execute_safe(self, command: str, timeout: int = 30) -> Dict[str, Any]:
            try:
                args = shlex.split(command)
                res = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
                return {"stdout": res.stdout, "stderr": res.stderr, "returncode": res.returncode}
            except Exception as e:
                return {"error": str(e)}


    # Instances used by the archived server module and tests
    filesystem_security = FileSystemSecurity()
    shell_security = ShellSecurity()



class FilesystemSecurity:
    @staticmethod
    def validate_path(root: str) -> Tuple[bool, str]:
        p = Path(root)
        if not p.exists() or not p.is_dir():
            return False, f"Root not a directory: {root}"
        return True, ""

    @staticmethod
    def read_safe(path: str) -> dict:
        try:
            p = Path(path)
            if p.is_dir():
                return {"error": "Path is a directory", "path": str(p)}
            content = p.read_text(encoding="utf-8", errors="ignore")
            return {"status": "success", "content": content}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    @staticmethod
    def write_safe(path: str, content: str, append: bool = False) -> dict:
        try:
            p = Path(path)
            mode = "a" if append else "w"
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(content, encoding="utf-8")
            return {"status": "success", "path": str(p)}
        except Exception as e:
            return {"status": "error", "error": str(e)}


class ShellSecurity:
    @staticmethod
    def execute_safe(command: str, timeout: int = 30) -> dict:
        try:
            # NOTE: This is a simplified execution wrapper for tests
            completed = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=timeout)
            return {"status": "success", "output": completed.stdout, "returncode": completed.returncode}
        except Exception as e:
            return {"status": "error", "error": str(e)}


filesystem_security = FilesystemSecurity()
shell_security = ShellSecurity()
