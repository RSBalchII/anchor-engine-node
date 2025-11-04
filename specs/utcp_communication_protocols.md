# UTCP Communication Protocols Specification

## Overview

This document details the Universal Tool Calling Protocol (UTCP) communication protocols implemented in the External Context Engine (ECE). The system supports multiple communication methods with a fallback mechanism for enhanced reliability and flexibility. All UTCP-related communications and logs are now consolidated in the main log file (`logs/ece-llamacpp.txt`) as part of the simplified logging approach.

## Supported Communication Protocols

### 1. HTTP/HTTPS Protocol
- **Purpose**: Primary synchronous communication method
- **Implementation**: Standard REST API calls with JSON payloads
- **Use Cases**: 
  - Tool discovery and registration
  - Synchronous tool execution
  - Health checks and status monitoring
  - Configuration updates
- **Endpoints**: All UTCP services expose `/utcp` endpoint for manual discovery
- **Methods**: Primarily POST for tool execution, GET for manual discovery
- **Logging**: UTCP communications appear in `logs/ece-llamacpp.txt` for centralized troubleshooting and monitoring

### 2. Server-Sent Events (SSE) Protocol
- **Purpose**: Streaming communication for long-running operations
- **Implementation**: HTTP-based streaming with event dispatch
- **Use Cases**:
  - Long-running tool executions with progress updates
  - Real-time results streaming
  - Asynchronous operations with continuous feedback
- **Endpoints**: `/stream` or tool-specific streaming endpoints
- **Features**: Automatic reconnection, event filtering
- **Logging**: SSE communications appear in `logs/ece-llamacpp.txt` for centralized troubleshooting and monitoring

### 3. WebSocket Protocol
- **Purpose**: Bidirectional real-time communication
- **Implementation**: RFC 6455 compliant WebSocket connections
- **Use Cases**:
  - Interactive tool sessions
  - Real-time collaborative operations
  - Bidirectional data exchange
- **Endpoints**: `/ws/utcp` or tool-specific WebSocket endpoints
- **Features**: Binary and text frame support, ping/pong keep-alive
- **Logging**: WebSocket communications appear in `logs/ece-llamacpp.txt` for centralized troubleshooting and monitoring

### 4. Model Context Protocol (MCP)
- **Purpose**: AI agent context-aware communication
- **Implementation**: Structured context exchange for AI interactions
- **Use Cases**:
  - Context-rich tool interactions
  - Multi-turn conversations with tools
  - Stateful tool sessions
- **Features**: Request/response correlation, context preservation
- **Logging**: MCP communications appear in `logs/ece-llamacpp.txt` for centralized troubleshooting and monitoring

### 5. Command-Line Interface (CLI) Integration
- **Purpose**: System-level tool access through command-line
- **Implementation**: UTCP-wrapper around command-line tools
- **Use Cases**:
  - System commands and utilities
  - File system operations
  - Process management
- **Features**: Standard input/output capture, exit code handling
- **Logging**: CLI communications appear in `logs/ece-llamacpp.txt` for centralized troubleshooting and monitoring

## Protocol Selection and Fallback Mechanism

### Automatic Protocol Selection
The ECE system automatically selects the most appropriate communication protocol based on:

1. **Tool Requirements**: Some tools may specify preferred communication protocols
2. **Operation Type**: Synchronous vs asynchronous, streaming vs batch, interactive vs fire-and-forget
3. **Network Conditions**: Current connection quality and stability
4. **Tool Availability**: Which communication protocols are supported by the target tool

### Fallback Strategy
The system implements a hierarchical fallback mechanism:

1. **Primary**: HTTP/HTTPS (most widely supported)
2. **Secondary**: SSE (for streaming operations)
3. **Tertiary**: WebSocket (for bidirectional communication)
4. **Quaternary**: MCP (for context-aware operations)
5. **Fallback**: CLI (for system-level tools)

If a communication attempt fails using the primary protocol, the system will automatically try the next available protocol in the sequence.

## UTCP Manual Structure

Each service provides a UTCP Manual at its `/utcp` endpoint with the following structure:

```json
{
  "manual_version": "1.0.0",
  "utcp_version": "1.0.0",
  "service_name": "filesystem_agent",
  "service_description": "File system operations agent",
  "supported_protocols": [
    {
      "protocol": "http",
      "endpoint": "http://localhost:8006",
      "methods": ["GET", "POST"],
      "capabilities": ["read_file", "write_file", "list_directory"]
    },
    {
      "protocol": "websocket",
      "endpoint": "ws://localhost:8006/ws",
      "capabilities": ["interactive_file_edit"]
    }
  ],
  "tools": [
    {
      "name": "read_file",
      "description": "Read contents of a file",
      "parameters": {
        "type": "object",
        "properties": {
          "path": {
            "type": "string",
            "description": "Path to the file to read"
          }
        },
        "required": ["path"]
      },
      "supported_protocols": ["http", "websocket"]
    }
  ]
}
```

## Configuration

### UTCP Client Configuration
The UTCP client is configured in the orchestrator agent with protocol preferences:

```python
self.utcp_config = {
    "manual_call_templates": [
        {
            "name": "filesystem_utcp",
            "call_template_type": "http",
            "url": "http://localhost:8006/utcp",
        },
        // ... other services
    ],
    "supported_protocols": [
        "http",
        "sse",
        "websocket", 
        "mcp",
        "cli"
    ],
    "protocol_fallback_order": ["http", "sse", "websocket", "mcp", "cli"],
    "timeout_settings": {
        "http_timeout": 60,
        "sse_timeout": 300,
        "websocket_timeout": 300,
        "mcp_timeout": 120
    }
}
```

### Protocol-Specific Settings
Each protocol supports specific configuration parameters:

#### HTTP Protocol
- `http_timeout`: Request timeout in seconds (default: 60)
- `http_retry_count`: Number of retry attempts (default: 3)
- `http_headers`: Custom headers to include with requests

#### SSE Protocol
- `sse_timeout`: Stream timeout in seconds (default: 300)
- `sse_retry_interval`: Milliseconds between reconnection attempts (default: 1000)
- `sse_buffer_size`: Size of the buffer for incoming events (default: 8192)

#### WebSocket Protocol
- `websocket_timeout`: Connection timeout in seconds (default: 300)
- `websocket_ping_interval`: Interval for ping/pong keepalive (default: 30)
- `websocket_max_message_size`: Maximum message size in bytes (default: 1MB)

## Best Practices

### Protocol Selection Guidelines
1. **HTTP**: Use for most synchronous tool calls, simple operations, and when compatibility is critical
2. **SSE**: Use for operations that produce streaming output or require progress updates
3. **WebSocket**: Use for interactive tools, bidirectional communication, and real-time operations
4. **MCP**: Use for AI context-aware tools with complex multi-turn interactions
5. **CLI**: Use for system-level operations and legacy command-line tools

### Error Handling
- Always implement proper error handling for each protocol
- Log protocol-specific errors for debugging
- Implement retry logic with exponential backoff
- Gracefully degrade to alternative protocols when needed

### Performance Considerations
- HTTP is lightweight but requires new connection for each request
- SSE provides persistent connections but consumes more server resources
- WebSocket offers optimal performance for bidirectional communication
- CLI integration has overhead of process creation but provides full OS access

## Security Implications

### Protocol Security
- All HTTP/SSE/WebSocket endpoints should use HTTPS in production
- Implement authentication for UTCP endpoints
- Validate all tool inputs regardless of communication protocol
- Apply rate limiting to prevent abuse

### Authentication Headers
When protocols support headers (HTTP, SSE, WebSocket), authentication can be passed:
- API key authentication
- Bearer token authentication
- Certificate-based authentication

## Troubleshooting

### Protocol-Specific Issues

#### HTTP Issues
- Check for CORS restrictions
- Verify content-type headers
- Confirm JSON payload format

#### SSE Issues
- Check for buffering issues in proxies/load balancers
- Verify server keeps connections alive
- Check for maximum connection limits

#### WebSocket Issues
- Check for proxy/web server WebSocket support
- Verify connection upgrade process
- Confirm ping/pong functionality

### Debugging Communication
Enable verbose logging to see protocol negotiations:
- Log protocol selection decisions
- Record fallback attempts
- Track performance metrics per protocol