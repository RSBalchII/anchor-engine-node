# Anchor - Technical Specification

## Mission Statement

Build an anchor for your thoughts - a **personal, memory-enhanced terminal AI** that embodies the principles of **clarity over complexity**, **working over perfect**, and **local-first sovereignty**. Fully integrate with ECE_Core's three-tier memory architecture (Redis + SQLite + Neo4j) with graceful degradation and optional components, ensuring the system works at every tier while getting progressively more powerful as components are added.

## Optional Tiers Architecture

The system implements graceful degradation across three optional memory tiers:

### Tier 1: SQLite Only (REQUIRED - Core Functionality)
- **Status**: ✅ WORKING (13,444 memories imported)
- **Purpose**: Persistent long-term memory storage
- **Characteristics**: On-disk storage with keyword/tag search
- **Usage**: Stores all conversation memories, provides keyword-based retrieval, functions as primary knowledge base
- **Works standalone** without Redis or Neo4j

### Tier 2: Redis Cache (OPTIONAL - Performance Enhancement)
- **Status**: 🔄 Optional (graceful fallback implemented)
- **Purpose**: Working memory for active conversations
- **Characteristics**: Fast in-memory storage for sessions
- **Usage**: Holds current conversation context (8k tokens), caches frequently accessed memories, reduces SQLite query overhead
- **Fallback**: If unavailable, uses SQLite summaries

### Tier 3: Neo4j Knowledge Graph (OPTIONAL - Advanced Associations)
- **Status**: ⏸️ Optional (awaiting installation)
- **Purpose**: Semantic memory and relationship mapping
- **Characteristics**: Graph-based association traversal with Q-Learning optimization
- **Usage**: Stores entity relationships, enables "How did X connect to Y?" queries, reconstructs thought chains
- **Fallback**: If unavailable, uses keyword search

**Philosophy**: System works at every tier, getting progressively more powerful as you add components. No hard dependencies.

---

## Core Philosophy

Aligned with ECE_Core principles:

1. **Dead Stupid Simple**: Every line of code earns its place
2. **Context Cache IS Intelligence**: Memory system is the core capability  
3. **Local-First Sovereignty**: Your data, your hardware, your control
4. **Working > Perfect**: Functional simplicity beats theoretical elegance
5. **Assistive by Design**: Reduce cognitive load, not capability

---

## Architecture Overview

### Memory Retrieval Flow

#### Standard Query (Tier 1 - SQLite Only)
```
User Query: "Tell me about July"
    ↓
Extract keywords: ["july"]
    ↓
Search SQLite: WHERE tags LIKE '%july%'
    ↓
Return top 5 memories by importance
    ↓
Inject into context → LLM → Response
```

#### With Redis Caching (Tier 2)
```
User Query
    ↓
Check Redis cache for session context
    ↓
If not cached:
  Search SQLite + cache result
    ↓
Return with faster retrieval
```

#### Association Query (Tier 3 - With Neo4j)
```
User Query: "How did we discuss memory strategies?"
    ↓
Detect association intent
    ↓
If Neo4j available:
  Find path: Memory → Strategies → Task Management
  Link to memories in database
Else:
  Fallback to keyword search
```

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Sovereign CLI (Terminal Interface)                     │
│  - Textual-based TUI                                    │
│  - Natural language prompts                             │
│  - Tool call visualization                              │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│  ECE_Core Integration (Graceful Degradation)            │
│  ├─ Redis (Tier 2 - Optional)                          │
│  ├─ SQLite (Tier 1 - Required, 13,444 memories)        │
│  └─ Neo4j (Tier 3 - Optional)                          │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│  UTCP Tool Layer                                        │
│  - Dynamic tool discovery                               │
│  - Pattern-based execution                              │
│  - Multi-protocol support (HTTP, CLI, MCP, WebSocket)  │
└─────────────────────────────────────────────────────────┘
```

### Key Components

**1. Terminal Interface** (`sovereign_cli.py`)
- Textual TUI with markdown rendering
- Session persistence across restarts
- Real-time token/memory statistics
- Command palette for tool discovery

**2. ECE Connector** (`ece_client.py`)
- HTTP client for ECE_Core API
- Health checking with fallback
- Streaming response support
- Context info retrieval

**3. UTCP Integration** (`utcp_client.py`)
- Manual-based tool discovery
- Multi-protocol transport (HTTP, CLI, MCP, WebSocket)
- Authentication management
- Async tool execution

**4. Pattern Detector** (`pattern_detector.py`)
- Keyword-to-tool mapping
- Natural language intent detection
- Automatic tool selection
- Context enhancement

---

## Data Flow

### Standard Chat Flow

```
User Input
    ↓
Pattern Detection → Tool Discovery
    ↓
Tool Execution (if matched)
    ↓
Context Enhancement
    ↓
ECE_Core /chat Endpoint
    ↓
├─ Redis: Check active context
├─ SQLite: Semantic search (embeddings)
├─ Neo4j: Graph traversal (Q-Learning)
└─ LLM: Generate response
    ↓
Response Display (Markdown)
```

### Tool-Enhanced Flow

```
User: "What's the weather in Tokyo?"
    ↓
Pattern Detector: weather_pattern → weather.get_current
    ↓
UTCP Call: weather.get_current(location="Tokyo")
    ↓
Tool Result: {"temp": 18, "conditions": "Cloudy"}
    ↓
Context Enhancement: 
    "Weather data for Tokyo: 18°C, Cloudy
     
     User question: What's the weather in Tokyo?"
    ↓
ECE_Core Processing → LLM Response
    ↓
Display: "Tokyo is currently 18°C and cloudy."
```

---

## API Specification

### ECE_Core Endpoints (Used by CLI)

**Health Check**
```http
GET /health
Response: 200 OK
```

**Chat**
```http
POST /chat
Content-Type: application/json

{
  "session_id": "string",
  "message": "string",
  "system_prompt": "string (optional)"
}

Response:
{
  "response": "string",
  "context_tokens": int,
  "summaries_count": int
}
```

**Context Info**
```http
GET /context/{session_id}

Response:
{
  "active_tokens": int,
  "summaries": [...]
}
```

### UTCP Integration

**Tool Discovery**
```python
# Fetch UTCP Manual from service
GET http://localhost:8007/utcp

Response: UtcpManual (JSON)
{
  "manual_version": "1.0.0",
  "tools": [
    {
      "name": "search_web",
      "description": "Search the web",
      "inputs": {...},
      "outputs": {...},
      "tool_call_template": {
        "call_template_type": "http",
        "url": "...",
        "http_method": "POST"
      }
    }
  ]
}
```

**Tool Execution**
```python
# Via UTCP Client
await client.call_tool(
    tool_name="websearch.search_web",
    tool_args={"query": "cognitive enhancement strategies"}
)
```

---

## Configuration

### Environment Variables (.env)

```env
# ECE_Core Connection
ECE_URL=http://localhost:8000
ECE_TIMEOUT=60

# Session Settings
SESSION_ID=default
AUTO_SESSION_ID=true

# Display Settings
SHOW_TOKEN_COUNT=true
SHOW_TIMESTAMPS=true
THEME=dark

# UTCP Services
UTCP_SERVICE_ENDPOINTS=http://localhost:8007,http://localhost:8008,http://localhost:8009

# Tool Settings
AUTO_TOOL_EXECUTION=true
TOOL_CONFIRMATION_REQUIRED=false
```

---

## Memory Integration Strategy

### How CLI Uses ECE Memory

**Short-term (Redis - Tier 2 - OPTIONAL)**
- Active conversation context
- Managed automatically by ECE_Core
- CLI sees this as "current_tokens" in responses
- **Fallback**: If unavailable, uses SQLite summaries

**Mid-term (SQLite - Tier 1 - REQUIRED)**  
- Keyword/tag search over 13,444 memories
- Provides basic memory retrieval
- Core functionality that always works
- Retrieved automatically when relevant

**Long-term (Neo4j - Tier 3 - OPTIONAL)**
- Graph traversal for associative recall
- Q-Learning optimized paths
- "When we talked about Dory, what else came up?"
- **Fallback**: If unavailable, uses keyword search

**CLI Responsibility**: 
- Send clear, contextualized prompts
- Display memory statistics
- Trust ECE to handle retrieval with graceful degradation
- Work at every tier level

### Memory Retrieval Implementation History

The system initially had issues with memory retrieval not working during chat sessions. The fix involved:

1. **Added Memory Storage to `memory.py`**:
   - New table: `memories` with fields: id, category, content, tags, importance, created_at, metadata
   - Methods: `add_memory()`, `get_recent_by_category()`, `search_memories()`

2. **Enhanced Context Building in `context_manager.py`**:
   - New method: `_retrieve_relevant_memories()` extracts keywords from user query
   - Updated `build_context()` with 4 tiers: Relevant Memories → Historical Context → Recent Conversation → Current Question

3. **Memory Retrieval Algorithm**:
   - Extract keywords from query
   - Search memory database for tags/content containing keywords
   - Return top results by importance + recency
   - Inject into context before LLM call

---

## Tool Pattern Detection

### Pattern Configuration (YAML)

```yaml
patterns:
  weather:
    keywords: [weather, temperature, forecast, climate]
    tool: weather.get_current
    confidence: high
  
  web_search:
    keywords: [search, find, look up, google]
    tool: websearch.search_web
    confidence: medium
    
  file_operations:
    keywords: [read file, write file, list directory]
    tool: filesystem.read
    confidence: high
    requires_confirmation: true
```

### Pattern Matching Algorithm

1. Tokenize user input
2. Match against keyword patterns
3. Score by confidence + keyword density
4. Select highest scoring tool
5. Execute (with confirmation if required)
6. Enhance context with result
7. Send to LLM

---

## UI Design Principles

### Inspired by GitHub Copilot CLI

**What We Keep:**
- Clean, uncluttered terminal interface
- Natural language prompts (no complex commands)
- Clear action preview before execution
- Markdown rendering for responses
- Session persistence

**What We Add:**
- Real-time memory statistics
- Tool execution visibility
- UTCP tool discovery palette
- ECE connection status indicator

### Screen Layout

```
┌─────────────────────────────────────────────────────────┐
│ Sovereign CLI - Session: abc123def  🟢 ECE Connected   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  You @ 14:22:31                                        │
│  ┌─────────────────────────────────────────────┐      │
│  │ What strategies did we discuss?            │      │
│  └─────────────────────────────────────────────┘      │
│                                                         │
│  Assistant @ 14:22:33 (2,847 tokens)                   │
│  ┌─────────────────────────────────────────────┐      │
│  │ Based on our conversation on Oct 15...       │      │
│  │                                               │      │
│  │ We discussed:                                 │      │
│  │ 1. Using Dory's memory approach...           │      │
│  │ 2. External context caching...               │      │
│  └─────────────────────────────────────────────┘      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Tokens: 2847 | Summaries: 12 | Tools: 3 available      │
├─────────────────────────────────────────────────────────┤
│ > _                                                     │
└─────────────────────────────────────────────────────────┘

Ctrl+C: Quit | Ctrl+L: Clear | Ctrl+T: Tools | Ctrl+I: Info
```

---

## Dependencies

### Core (Minimal)

```
textual>=0.47.0          # TUI framework
httpx>=0.25.0           # HTTP client
python-dotenv>=1.0.0    # Environment config
rich>=13.7.0            # Markdown rendering
pyyaml>=6.0             # Config files
```

### UTCP Integration

```
utcp>=1.0.0             # Core UTCP
utcp-http>=1.0.0        # HTTP transport
utcp-cli>=1.0.0         # CLI transport  
utcp-mcp>=1.0.0         # MCP transport
utcp-websocket>=1.0.0   # WebSocket transport
```

### Optional

```
aiofiles>=23.0.0        # Async file ops
orjson>=3.9.0          # Fast JSON parsing
```

**Total Lines**: Target ~500 lines (currently ~220)

---

## Security Considerations

**Authentication**
- ECE_Core runs locally (no auth needed for localhost)
- UTCP tools may require API keys (via env vars)
- Never commit secrets to repo

**Input Validation**
- Sanitize user input before UTCP calls
- Validate tool parameters against schema
- Timeout protection on tool calls

**Data Sovereignty**
- All data stays local (Redis/SQLite/Neo4j)
- No telemetry, no cloud calls (unless explicit tools)
- User owns all conversation history

---

## Performance Targets

- **Startup**: <1 second
- **Tool Discovery**: <500ms (cached after first fetch)
- **ECE Response**: <5 seconds for typical query
- **Memory Overhead**: <100MB (TUI + client)
- **Tool Execution**: <10 seconds per tool call

---

## Error Handling

### Graceful Degradation

```
ECE_Core Unreachable
    ↓
Display Error: "Cannot connect to ECE_Core"
Show Instructions: "Start ECE: cd ECE_Core && python main.py"
Retry Available: Press 'R' to retry
```

```
UTCP Tool Failure
    ↓
Log Error: "Tool 'websearch.search' failed: timeout"
Fallback: Continue without tool result
Display: "[Tool call failed, continuing with question]"
```

### User Feedback

- All errors shown as red panels
- System messages in dim italic
- Success confirmations in green
- Tool executions highlighted in cyan

---

## Testing Strategy

### Unit Tests
- ECE client health checks
- UTCP manual parsing
- Pattern detection accuracy
- Config loading

### Integration Tests  
- Full chat flow with ECE_Core
- Tool discovery and execution
- Memory retrieval verification
- Session persistence

### Manual Testing
- Run ECE_Core locally
- Test various prompt patterns
- Verify tool auto-execution
- Check memory statistics

---

## Future Enhancements (Deferred)

- Voice input/output (when portable deployment ready)
- Multi-pane split views (code + chat)
- Plugin system for custom tools
- Collaborative sessions (multi-user)
- Export conversations to markdown

**Principle**: Add only when needed, keep core simple.

---

## Security Features

### Shell Command Whitelist (mcp/security.py)

**Purpose**: Prevent execution of dangerous commands

**Configuration** (`.env`):
```bash
SHELL_WHITELIST_ENABLED=true
SHELL_ALLOWED_COMMANDS=ls,dir,pwd,cat,echo,python,node,git
SHELL_EXECUTION_TIMEOUT=30
SHELL_MAX_OUTPUT_SIZE=10000
```

**Features**:
- Whitelist of allowed base commands
- Dangerous pattern detection (rm -rf, fork bombs, mkfs)
- Output size limiting
- Execution timeout enforcement

**Usage**:
```python
from mcp.security import shell_security

result = shell_security.execute_safe("ls -la", timeout=10)
# Validates command, checks patterns, enforces limits
```

### Filesystem Path Protection (mcp/security.py)

**Purpose**: Prevent path traversal and unauthorized file access

**Configuration** (`.env`):
```bash
FILESYSTEM_ALLOWED_PATHS=C:\Users\rsbiiw\Projects,/home
FILESYSTEM_DENY_PATHS=C:\Windows\System32,/etc,/root
FILESYSTEM_ALLOW_TRAVERSAL=false
```

**Features**:
- Allowed paths whitelist
- Denied paths blacklist (takes precedence)
- Path traversal (`../`) detection
- Resolved path validation
- File size limiting

**Usage**:
```python
from mcp.security import filesystem_security

result = filesystem_security.read_safe("/path/to/file", max_size=10000)
# Validates path, checks permissions, enforces size limit
```

### API Key Integration

**Purpose**: Authenticate with ECE_Core

**Configuration** (`.env`):
```bash
ECE_API_KEY=<your-api-key>
```

**Implementation**: `main.py` sends API key in `Authorization: Bearer <key>` header for all requests to ECE_Core.

---

## Testing

**Test Suite**: 18 automated tests
---

## Tool Execution Architecture

This section is based on `TOOL_ARCHITECTURE.md` and describes how Anchor implements the Copilot CLI tool execution pattern.

### Overview
Anchor follows the GitHub Copilot CLI pattern where a model may request tools via `tool_use`/`TOOL_CALL` and the CLI presents the proposed call to the user for approval; once approved, the CLI executes the tool and returns a `tool_result` block to the model.

### Flow Summary
1. Model emits `tool_use` or `TOOL_CALL` block
2. CLI parses the proposed tool call(s)
3. CLI presents parsed tool calls to the user with a safety assessment
4. User approves or denies each call
5. Approved calls are executed against local MCP servers
6. Tool results are packaged as `tool_result` and returned to the model

### Implementation
- `tool_execution.py`: Parses tool calls and manages approval/execution
- `tool_safety.py`: Implements SAFE/DANGEROUS/BLOCKED categories and sanitization
- `mcp/client.py`: MCP client used for calling tools

### Tool Categories
- SAFE Tools: filesystem_read, filesystem_list_directory, web_search
- DANGEROUS Tools: shell_execute, filesystem_write
- BLOCKED Tools: user-configurable via envvar `BLOCKED_TOOLS`

### Formats Supported
- `TOOL_CALL: filesystem_read(path="README.md")`
- JSON `{"tool_use": {"name": "filesystem_read", "input": {...}}}`
- Anthropic-style `<tool_use>...</tool_use>` (not yet implemented)

### Approval Flow
The CLI shows the proposed tool call (name, parameters, safety level). The user can approve (y), deny (n), or allow all (a). If approved, `ToolExecutionManager` runs the call and returns the result.

### Shell Sanitization
`tool_safety.py` implements shell command sanitization, dangerous pattern detection (rm -rf, dd, wget | sh), and flags commands requiring explicit approval. Filesystem path access is validated against `FILESYSTEM_ALLOWED_PATHS` and `FILESYSTEM_DENY_PATHS`.

### Testing
Unit tests should verify parsing, approval flow, and safety enforcement; integration tests must cover an end-to-end model → approval → tool execution → tool_result flow.

- Command whitelisting validation
- Dangerous pattern detection
- Path validation and traversal blocking
- Allowed/denied path enforcement
- File size limits
- Output truncation
- Integration tests

**Run Tests**:
```bash
run_tests.bat  # Windows
pytest tests/  # Manual
```

**Coverage Target**: 50%+

---

## Security Checklist

Before production:
- [ ] Review `SHELL_ALLOWED_COMMANDS` - minimize to essentials
- [ ] Set `FILESYSTEM_ALLOWED_PATHS` - restrict to needed directories
- [ ] Set `FILESYSTEM_DENY_PATHS` - block system directories
- [ ] Disable path traversal (`FILESYSTEM_ALLOW_TRAVERSAL=false`)
- [ ] Generate strong API key for ECE_Core
- [ ] Run tests (`run_tests.bat`)
- [ ] Test blocked commands (try `rm -rf /`)
- [ ] Test path traversal (try `../../etc/passwd`)
