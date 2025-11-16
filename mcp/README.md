# Anchor MCP Server

**Embedded Model Context Protocol (MCP) tool server for Anchor CLI**

## Overview

This MCP server provides tools for Anchor CLI to enhance LLM interactions with:
- File system operations (read files, list directories)
- Shell command execution
- Web search capabilities

## Architecture

The MCP server runs embedded in Anchor CLI as a subprocess. When Anchor starts, it automatically launches the MCP server on port 8008.

## Available Tools

### 1. filesystem_read
Read file contents or list directory contents.

**Parameters**:
- `path` (string, required): Absolute path to file or directory

**Returns**:
- For files: content (limited to 10KB), size, path
- For directories: list of items with name, type, size

### 2. shell_execute
Execute shell commands safely.

**Parameters**:
- `command` (string, required): Shell command to execute
- `timeout` (number, optional): Timeout in seconds (default: 30)

**Returns**:
- `returncode`: Exit code
- `stdout`: Command output (limited to 5KB)
- `stderr`: Error output (limited to 5KB)
- `success`: Boolean indicating success

### 3. web_search
Search the web using DuckDuckGo.

**Parameters**:
- `query` (string, required): Search query
- `max_results` (number, optional): Maximum results (default: 5)

**Returns**:
- Search results or error message

## Endpoints

- `GET /mcp/tools` - List available tools with schemas
- `POST /mcp/call` - Execute a tool call
- `GET /health` - Health check

## Usage

### Standalone Mode
```bash
cd anchor/mcp
python server.py
```

### Embedded Mode (Automatic)
The MCP server starts automatically when Anchor CLI launches.

## Implementation Details

- **Port**: 8008 (default)
- **Host**: 127.0.0.1 (localhost only)
- **Protocol**: HTTP/JSON-RPC style
- **Framework**: FastAPI

## Security Considerations

1. **Localhost only**: Server binds to 127.0.0.1, not accessible externally
2. **Output limits**: File and command output capped at 10KB/5KB
3. **Timeout protection**: Shell commands have timeout limits
4. **No auth required**: Localhost-only removes need for authentication

## Future Enhancements

Planned tool additions:
- Git operations (status, diff, commit)
- Code analysis (syntax check, linting)
- File write operations (with safety checks)
- Advanced web search (with result parsing)
