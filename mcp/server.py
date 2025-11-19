#!/usr/bin/env python3
"""
THIS FILE HAS BEEN ARCHIVED
The Anchor MCP Server has been moved to the archive to remove MCP from the active runtime.
If you need to restore the full functionality, copy the files from:
    archive/removed_tool_protocols/mcp-utcp/anchor/mcp/
into this directory and restart Anchor.
"""

raise ImportError("MCP server archived; see archive/removed_tool_protocols/mcp-utcp/anchor/mcp/")
import asyncio
import json
import subprocess
import os
from pathlib import Path
from typing import Any, List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx

# Import security modules
try:
    from mcp.security import shell_security, filesystem_security
except ImportError:
    # Fallback for running server.py directly
    from security import shell_security, filesystem_security

app = FastAPI(title="Anchor MCP Server")

# ============================================================================
# SCHEMAS
# ============================================================================

class ToolSchema(BaseModel):
    name: str
    description: str
    inputSchema: dict

class ToolCall(BaseModel):
    name: str
    arguments: dict

# ============================================================================
# MCP TOOLS - FILESYSTEM
# ============================================================================

FILESYSTEM_TOOL = ToolSchema(
    name="filesystem_read",
    description="Read contents of a file or list directory contents",
    inputSchema={
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Absolute path to file or directory"
            }
        },
        "required": ["path"]
    }
)

def filesystem_read(path: str) -> dict:
    """Read file or list directory with security checks"""
    return filesystem_security.read_safe(path)

# Safe write tool
FILESYSTEM_WRITE_TOOL = ToolSchema(
    name="filesystem_write",
    description="Write or append text content to a file (safe extensions only)",
    inputSchema={
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "Absolute path to file"},
            "content": {"type": "string", "description": "Text content to write"},
            "append": {"type": "boolean", "description": "Append instead of overwrite (default: false)"}
        },
        "required": ["path", "content"]
    }
)

def filesystem_write(path: str, content: str, append: bool = False) -> dict:
    return filesystem_security.write_safe(path, content, append)

# ============================================================================
# MCP TOOLS - SHELL COMMANDS
# ============================================================================

SHELL_TOOL = ToolSchema(
    name="shell_execute",
    description="Execute a shell command and return output",
    inputSchema={
        "type": "object",
        "properties": {
            "command": {
                "type": "string",
                "description": "Shell command to execute (e.g., 'ls -la', 'python --version')"
            },
            "timeout": {
                "type": "number",
                "description": "Timeout in seconds (default: 30)"
            }
        },
        "required": ["command"]
    }
)

def shell_execute(command: str, timeout: int = 30) -> dict:
    """Execute shell command with security checks"""
    return shell_security.execute_safe(command, timeout)

# ============================================================================
# MCP TOOLS - WEB SEARCH
# ============================================================================

WEB_SEARCH_TOOL = ToolSchema(
    name="web_search",
    description="Search the web using DuckDuckGo",
    inputSchema={
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query"
            },
            "max_results": {
                "type": "number",
                "description": "Maximum number of results (default: 5)"
            }
        },
        "required": ["query"]
    }
)

async def web_search(query: str, max_results: int = 5) -> dict:
    """Search the web"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Using DuckDuckGo HTML search (no API key needed)
            response = await client.get(
                "https://html.duckduckgo.com/",
                params={"q": query},
                headers={"User-Agent": "Mozilla/5.0"}
            )
            
            # Basic HTML parsing (would use BeautifulSoup in production)
            if response.status_code == 200:
                return {
                    "query": query,
                    "status": "success",
                    "message": f"Search completed for: {query}",
                    "results_requested": max_results,
                    "note": "To get actual results, integrate with DuckDuckGo API or use search library"
                }
            else:
                return {"error": f"Search failed with status {response.status_code}"}
    except Exception as e:
        return {"error": str(e)}

# ============================================================================
# MCP TOOLS - CODE SEARCH
# ============================================================================

CODE_SEARCH_TOOL = ToolSchema(
    name="code_search",
    description="Search code files under a root for a query (substring or regex)",
    inputSchema={
        "type": "object",
        "properties": {
            "root": {"type": "string", "description": "Root directory to search"},
            "query": {"type": "string", "description": "Search string or regex"},
            "regex": {"type": "boolean", "description": "Treat query as regex (default: false)"},
            "max_results": {"type": "number", "description": "Max results (default: 50)"}
        },
        "required": ["root", "query"]
    }
)

def _is_code_file(path: Path) -> bool:
    exts = {".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".yml", ".yaml", ".md", ".toml", ".ini", ".cfg", ".go", ".rs", ".java", ".c", ".h", ".cpp", ".cs", ".txt"}
    return path.suffix.lower() in exts

def code_search(root: str, query: str, regex: bool = False, max_results: int = 50, glob: str = None, context: int = 2) -> dict:
    ok, err = filesystem_security.validate_path(root)
    if not ok:
        return {"error": err, "root": root, "blocked": True}
    try:
        r = Path(root)
        if not r.exists() or not r.is_dir():
            return {"error": f"Root not a directory: {root}"}
        results: List[dict] = []
        import re as _re
        pattern = None
        if regex:
            try:
                pattern = _re.compile(query)
            except Exception as e:
                return {"error": f"Invalid regex: {e}"}
        max_file_size = 500000
        import fnmatch as _fn
        for dirpath, dirnames, filenames in os.walk(r):
            for name in filenames:
                p = Path(dirpath) / name
                if not _is_code_file(p):
                    continue
                if glob and not _fn.fnmatch(name, glob):
                    continue
                try:
                    size = p.stat().st_size
                    if size > max_file_size:
                        continue
                    lines = p.read_text(encoding="utf-8", errors="ignore").splitlines()
                    matches = []
                    for i, line in enumerate(lines):
                        hit = False
                        if pattern:
                            if pattern.search(line):
                                hit = True
                        else:
                            if query.lower() in line.lower():
                                hit = True
                        if hit:
                            start = max(i - context, 0)
                            end = min(i + context + 1, len(lines))
                            snippet = "\n".join(f"{j+1}: {lines[j]}" for j in range(start, end))
                            matches.append({"line": i + 1, "snippet": snippet})
                            if len(matches) >= 3:
                                break
                    if matches:
                        results.append({"path": str(p), "size": size, "matches": matches})
                        if len(results) >= max_results:
                            break
                except Exception:
                    continue
            if len(results) >= max_results:
                break
        return {"root": str(r), "query": query, "count": len(results), "results": results}
    except Exception as e:
        return {"error": str(e)}

def code_grep(root: str, query: str, regex: bool = False, max_results: int = 50, glob: str = None, exclude_globs: List[str] = None, context: int = 2) -> dict:
    ok, err = filesystem_security.validate_path(root)
    if not ok:
        return {"error": err, "root": root, "blocked": True}
    try:
        r = Path(root)
        if not r.exists() or not r.is_dir():
            return {"error": f"Root not a directory: {root}"}
        import re as _re
        import fnmatch as _fn
        pattern = None
        if regex:
            try:
                pattern = _re.compile(query)
            except Exception as e:
                return {"error": f"Invalid regex: {e}"}
        total_matches = 0
        results: List[dict] = []
        max_file_size = 500000
        for dirpath, dirnames, filenames in os.walk(r):
            for name in filenames:
                p = Path(dirpath) / name
                if not _is_code_file(p):
                    continue
                if glob and not _fn.fnmatch(name, glob):
                    continue
                if exclude_globs:
                    excluded = False
                    for eg in exclude_globs:
                        if _fn.fnmatch(name, eg):
                            excluded = True
                            break
                    if excluded:
                        continue
                try:
                    size = p.stat().st_size
                    if size > max_file_size:
                        continue
                    lines = p.read_text(encoding="utf-8", errors="ignore").splitlines()
                    matches = []
                    for i, line in enumerate(lines):
                        hit = False
                        if pattern:
                            if pattern.search(line):
                                hit = True
                        else:
                            if query.lower() in line.lower():
                                hit = True
                        if hit:
                            total_matches += 1
                            start = max(i - context, 0)
                            end = min(i + context + 1, len(lines))
                            snippet = "\n".join(f"{j+1}: {lines[j]}" for j in range(start, end))
                            matches.append({"line": i + 1, "snippet": snippet})
                            if len(matches) >= 5:
                                break
                    if matches:
                        results.append({"path": str(p), "size": size, "match_count": len(matches), "matches": matches})
                        if len(results) >= max_results:
                            break
                except Exception:
                    continue
            if len(results) >= max_results:
                break
        return {"root": str(r), "query": query, "files": len(results), "total_matches": total_matches, "results": results}
    except Exception as e:
        return {"error": str(e)}

# ============================================================================
# MCP ENDPOINTS
# ============================================================================

@app.get("/mcp/tools")
async def list_tools():
    """List available tools with their schemas"""
    return {
        "tools": [
            FILESYSTEM_TOOL.dict(),
            FILESYSTEM_WRITE_TOOL.dict(),
            SHELL_TOOL.dict(),
            WEB_SEARCH_TOOL.dict(),
            CODE_SEARCH_TOOL.dict(),
            {
                "name": "code_grep",
                "description": "Grep-like search with match counts and optional exclusions",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "root": {"type": "string"},
                        "query": {"type": "string"},
                        "regex": {"type": "boolean"},
                        "max_results": {"type": "number"},
                        "glob": {"type": "string"},
                        "exclude_globs": {"type": "array", "items": {"type": "string"}},
                        "context": {"type": "number"}
                    },
                    "required": ["root", "query"]
                }
            }
        ]
    }

@app.post("/mcp/call")
async def call_tool(tool_call: ToolCall):
    """Execute a tool call"""
    try:
        if tool_call.name == "filesystem_read":
            result = filesystem_read(**tool_call.arguments)
        elif tool_call.name == "filesystem_write":
            result = filesystem_write(**tool_call.arguments)
        elif tool_call.name == "shell_execute":
            result = shell_execute(**tool_call.arguments)
        elif tool_call.name == "web_search":
            result = await web_search(**tool_call.arguments)
        elif tool_call.name == "code_search":
            result = code_search(**tool_call.arguments)
        elif tool_call.name == "code_grep":
            result = code_grep(**tool_call.arguments)
        else:
            raise HTTPException(status_code=404, detail=f"Tool not found: {tool_call.name}")
        
        return {
            "tool": tool_call.name,
            "status": "success",
            "result": result
        }
    except Exception as e:
        return {
            "tool": tool_call.name,
            "status": "error",
            "error": str(e)
        }

@app.get("/health")
async def health():
    """Health check"""
    return {
        "status": "ok",
        "service": "Anchor MCP Server",
        "tools": 6
    }

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    print("MCP server functionality archived. See archive/removed_tool_protocols/mcp-utcp/anchor/mcp/")
