# External Context Engine (ECE) Specification v3.4

## Overview

The External Context Engine (ECE) is a sophisticated system designed to manage, retrieve, and utilize contextual information for AI-driven tasks. Version 3.4 enhances the architecture with Universal Tool Calling Protocol (UTCP) integration, replacing bespoke wrapper APIs with standardized tool definitions that can be discovered and called through a central UTCP Tool Registry. This upgrade enables dynamic tool discovery and calling between ECE agents while maintaining all existing functionality including tool integration capabilities that enable the system to help write and modify its own code. The system now includes specialized agents for file operations, directory access, web search, and a rich command-line interface that enables seamless human-machine collaboration.

## Core Components

- **UTCP Tool Registry**: Central service for tool discovery and registration, providing standardized access to all ECE capabilities
- **UTCP Client**: Standardized client library for discovering and calling tools via the registry
- **Orchestrator**: The central routing component that manages prompt ingestion and distribution to appropriate agents, including new tool agents.
- **Archivist**: Responsible for context retrieval from long-term memory and managing the context cache.
- **QLearningAgent**: Interfaces with the Neo4j knowledge graph to retrieve relevant context.
- **Injector**: Handles the conversion of short-term memory (cache) into long-term memory (graph).
- **Synthesizer**: Processes outputs from Thinker agents to produce final analyses.
- **FileSystemAgent**: Specialized agent for file system operations, enabling code reading/writing capabilities.
- **WebSearchAgent**: Provides web search functionality using Tavily API for current information.
- **ECE-CLI**: Default frontend interface providing rich command-line interaction with persistent context.
- **Redis Context Cache**: A short-term memory storage system.
- **Neo4j Knowledge Graph**: A long-term memory storage system.

## UTCP Architecture

### Tool Definition Schema
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for the tool in format agent.function_name"
    },
    "name": {
      "type": "string",
      "description": "Human-readable name of the tool"
    },
    "description": {
      "type": "string",
      "description": "Brief description of what the tool does"
    },
    "category": {
      "type": "string",
      "description": "Category of the tool (e.g., data_processing, retrieval, analysis)"
    },
    "parameters": {
      "type": "object",
      "description": "JSON Schema for the tool parameters"
    },
    "returns": {
      "type": "object",
      "description": "JSON Schema for the tool response"
    },
    "endpoint": {
      "type": "string",
      "description": "The service endpoint where the tool is available"
    },
    "version": {
      "type": "string",
      "description": "Version of the tool definition"
    },
    "agent": {
      "type": "string",
      "description": "The agent that provides this tool"
    }
  },
  "required": ["id", "name", "description", "parameters", "returns", "endpoint", "version", "agent"]
}
```

### Registry API Endpoints
- `GET /tools` - Get all available tools
- `GET /tools/{tool_id}` - Get specific tool definition
- `POST /tools` - Register a new tool
- `DELETE /tools/{tool_id}` - Remove a tool
- `GET /health` - Health check for the registry

### UTCP Client Interface
```python
class UTCPClient:
    def __init__(self, registry_url: str):
        """Initialize the UTCP client with the registry URL"""
        
    async def discover_tool(self, tool_id: str) -> ToolDefinition:
        """Discover a specific tool by ID"""
        
    async def discover_tools_by_agent(self, agent_name: str) -> List[ToolDefinition]:
        """Discover all tools provided by a specific agent"""
        
    async def discover_tools_by_category(self, category: str) -> List[ToolDefinition]:
        """Discover all tools in a specific category"""
        
    async def call_tool(self, tool_id: str, **kwargs) -> Any:
        """Call a tool by ID with the provided parameters"""
        
    async def list_all_tools(self) -> List[ToolDefinition]:
        """List all available tools in the registry"""
```

## Data Flows

### 1. Universal Context Retrieval Flow (Critical)

This is the foundational, non-negotiable data flow for ALL incoming prompts. It ensures every action is informed by long-term memory.

1. **Ingestion**: The Orchestrator receives the initial prompt from the client (ECE-CLI).
2. **Universal Routing**: The Orchestrator IMMEDIATELY routes the prompt (or its keywords) to the Archivist via UTCP `archivist.get_context` tool. This is a mandatory first step for ALL prompt types (analysis, conversational, memory query).
3. **Graph Query**: The Archivist queries the QLearningAgent using UTCP `qlearning.find_optimal_path` tool for relevant context from the Neo4j knowledge graph.
4. **Context Summarization**: The Archivist receives the context nodes from the QLearningAgent and summarizes them into a coherent context block, including specific examples (code, conversations). The size of this block must be configurable.
5. **Context Injection**: The Archivist returns the enriched, summarized context block to the Orchestrator.
6. **Enriched Execution**: The Orchestrator prepends the enriched context to the original prompt and ONLY THEN routes the new, combined payload to the appropriate agent (Synthesizer, ConversationalAgent, FileSystemAgent, WebSearchAgent, etc.) using UTCP tools for execution.

### 2. Tool Access Flow (Critical for Self-Development)

Defines how the ECE accesses local files and web resources to enable self-modification.

1. **Tool Detection**: The Orchestrator identifies when a prompt requires file or web access using UTCP tool discovery.
2. **Tool Routing**: The Orchestrator routes file/directory requests to FileSystemAgent or web requests to WebSearchAgent via UTCP tools.
3. **File Access**: The FileSystemAgent performs file operations (read, write, create, delete) while respecting security boundaries.
4. **Web Search**: The WebSearchAgent performs online queries using Tavily API for current information.
5. **Result Injection**: Tool results are injected back into the context before final response generation.
6. **Cache Update**: Tool access results are stored in the Redis cache for future reference.

### 3. Complex Reasoning & Output Flow (High Priority)

Defines the correct asynchronous process for handling complex reasoning tasks and delivering results.

1. **Initiation**: The Orchestrator starts the asynchronous reasoning task and returns an `analysis_id` to the client.
2. **Synthesis**: The Synthesizer agent processes the outputs from the Thinker agents into a final, complete analysis.
3. **Result Storage**: The Synthesizer sends the final analysis back to the Orchestrator.
4. **Cache Update**: The Orchestrator MUST store the final analysis in the Redis cache using the format "analysis:<analysis_id>" and update the task status to "complete".
5. **Client Retrieval**: The client can now successfully retrieve the completed analysis by polling the `/get_analysis_result` endpoint with the `analysis_id`.

### 4. Memory Preservation (Cache Truncation) Flow (Medium Priority)

The process for converting short-term memory (cache) into long-term memory (graph) before data is lost.

1. **Periodic Scan**: The Archivist will periodically perform a "tail read" on the Redis Context Cache (e.g., the oldest 1000 characters).
2. **Pre-emptive Archiving**: The Archivist sends this oldest block of context directly to the Injector agent using UTCP `injector.data_to_inject` tool.
3. **Graph Solidification**: The Injector receives the context, performs its de-duplication checks, and writes the information to the Neo4j knowledge graph.

### 5. Self-Development and Code Modification Flow (High Priority)

Enables the ECE to autonomously modify its own codebase based on requirements and feedback.

1. **Self-Modification Trigger**: The Orchestrator identifies when system code changes are needed.
2. **Code Analysis**: The ECE uses UTCP-discovered FileSystemAgent tools to read current implementation files.
3. **Context Integration**: The ECE combines current code context with specifications and requirements.
4. **Code Generation**: Thinker agents generate appropriate code modifications.
5. **Code Writing**: The ECE uses UTCP-discovered FileSystemAgent tools to write updated code.
6. **Verification**: The changes are verified against specifications and stored in the knowledge graph.

### 6. CLI Interaction Flow (Critical for User Experience)

Defines how the ECE-CLI provides the primary interface for user interaction with rich context management.

1. **Session Initialization**: ECE-CLI establishes a persistent session with context preservation across interactions.
2. **Command Processing**: CLI interprets user input and sends to Orchestrator with session context.
3. **Response Formatting**: Orchestrator responses are formatted with rich output (POML emotional lexicon, structured data).
4. **Context Persistence**: Conversation history is maintained across CLI sessions using the context cache.
5. **Multi-turn Interactions**: Complex conversations are supported with memory of previous exchanges.

### 7. Cohesion Loop (Line of Thought) Flow (Low Priority)

The process for the ECE's self-reflection, triggered by an empty prompt.

1. **Trigger**: The Orchestrator receives an empty prompt from the client.
2. **Cache Analysis**: The Orchestrator reads the current content of the Context Cache.
3. **Self-Reflection**: The Orchestrator generates a "thought" or a summary of its current internal state based on the cache contents.
4. **Append to Cache**: This generated "thought" is appended back into the Context Cache, creating a visible "line of thought." This output is NOT sent back to the user.

## CLI Interface Specification

### ECE-CLI (Local-CLI)
- **Purpose**: Default frontend providing rich command-line interaction with persistent context and memory; to be open-sourced as "local-cli" for community use
- **Architecture**: Inspired by Gemini and Qwen CLIs with enhanced context awareness
- **Local Integration**: Optimized for local Ollama model execution
- **Open Source Mission**: Independent from corporate platforms to enable community-driven development
- **Features**:
  - Persistent conversation sessions across CLI restarts
  - Rich history with ability to reference previous exchanges
  - Context-aware responses leveraging ECE's memory systems
  - Support for POML emotional lexicon and persona
  - Multi-modal command capabilities
  - Configuration management for local models
  - Session export/import functionality
  - Quality of life improvements matching Gemini/Qwen CLI experience

### Key CLI Features (Inspired by Gemini/Qwen CLIs)
- **Session Management**: Named sessions with context preservation
- **History Navigation**: Browse and reference previous conversation turns
- **Context Anchoring**: Ability to focus on specific parts of conversation history
- **Configuration Profiles**: Multiple model/setting profiles
- **Rich Output Formatting**: Support for markdown, code blocks, and POML emotion codes
- **File Integration**: Direct file input/output capabilities
- **Code Interaction**: Enhanced support for code-related tasks with syntax highlighting
- **Enhanced UX**: Arrow key navigation, proper text editing, smooth command history
- **Welcome Screen**: Attractive startup screen inspired by Gemini/Qwen CLIs
- **Text Editing**: Proper cursor movement and text editing capabilities

### Local-CLI Open Source Initiative
- **Mission**: Provide an alternative to corporate AI platforms
- **Independence**: Self-hosted, privacy-focused, community-driven
- **Extensibility**: Allow users to customize and extend functionality
- **Quality of Life**: Match and exceed the experience of commercial CLIs
- **Community**: Foster open source development and contribution

### Quality of Life Improvements
- **Arrow Key Navigation**: Arrow keys should navigate text cursor position instead of creating invisible characters
- **Text Editing**: Full command-line editing with proper cursor movement
- **Command History**: Enhanced command history with arrow-up/down navigation
- **Welcome Screen**: Professional welcome screen with branding and usage instructions
- **Input Validation**: Proper input validation and error handling
- **Performance**: Optimized response times and smooth interaction
- **Customization**: User-configurable appearance and behavior settings

### Local Ollama Integration
- **Model Management**: Direct communication with local Ollama instance
- **Performance Optimization**: Leverages local resources for faster responses
- **Privacy**: Keeps sensitive conversations on local system
- **Flexibility**: Supports multiple local models simultaneously

- **Capabilities**: 
  - Read files with proper encoding handling
  - List directory contents
  - Write and update files
  - Execute shell commands (requires careful security considerations)

- **Integration**: Works with context cache to store accessed files for reference

### WebSearchAgent
- **Purpose**: Provide web search capabilities using Tavily API
- **Security**: Implements rate limiting and safe search parameters
- **Capabilities**:
  - Current information retrieval
  - Fact checking
  - Trend analysis
- **Integration**: Results are stored in context cache for future reference

## UTCP Agent Specifications

### FileSystemAgent
- **Purpose**: Provide secure access to the file system for reading, writing, and directory operations
- **Security**: Implements read/write boundaries to prevent unauthorized access
- **Capabilities**: 
  - Read files with proper encoding handling
  - List directory contents
  - Write and update files
  - Execute shell commands (requires careful security considerations)
- **Integration**: Works with context cache to store accessed files for reference
- **UTCP Registration**: Registers tools as `filesystem.read_file`, `filesystem.write_file`, etc.

### WebSearchAgent
- **Purpose**: Provide web search capabilities using Tavily API
- **Security**: Implements rate limiting and safe search parameters
- **Capabilities**:
  - Current information retrieval
  - Fact checking
  - Trend analysis
- **Integration**: Results are stored in context cache for future reference
- **UTCP Registration**: Registers tools as `web_search.query`, etc.

### Orchestrator Agent
- **Purpose**: Central coordinator for routing prompts and managing agent interactions
- **UTCP Integration**: Uses UTCP to discover and call all other agent tools
- **Capabilities**: 
  - Tool discovery and selection
  - Dynamic agent routing
  - Context management
- **UTCP Registration**: Registers tools as `orchestrator.process_prompt`, `orchestrator.get_analysis_result`, etc.

### Archivist Agent
- **Purpose**: Master controller of the memory cortex, managing knowledge graph operations
- **UTCP Integration**: Registers all memory-related tools in the registry
- **Capabilities**:
  - Context retrieval from Neo4j knowledge graph
  - Enhanced context coordination with QLearningAgent
  - Memory query operations
- **UTCP Registration**: Registers tools as `archivist.get_context`, `archivist.get_enhanced_context`, `archivist.memory_query`, etc.

### QLearning Agent
- **Purpose**: Reinforcement learning agent for optimal path finding in knowledge graph
- **UTCP Integration**: Registers path-finding and relationship refinement tools
- **Capabilities**:
  - Optimal path finding between concepts
  - Relationship refinement using reinforcement learning
  - Up to 1M token processing with GPU acceleration
- **UTCP Registration**: Registers tools as `qlearning.find_optimal_path`, `qlearning.refine_relationships`, etc.

### Injector Agent
- **Purpose**: Persists structured data to the Neo4j knowledge graph
- **UTCP Integration**: Registers data injection and temporal node tools
- **Capabilities**:
  - Data injection into Neo4j
  - Temporal spine creation and linking
  - Node and relationship creation
- **UTCP Registration**: Registers tools as `injector.data_to_inject`, `injector.get_or_create_timenode`, `injector.link_memory_to_timenode`, etc.

### Distiller Agent
- **Purpose**: Processes raw text to extract structured information for storage
- **UTCP Integration**: Registers text processing tools
- **Capabilities**:
  - Entity extraction using spaCy
  - Relationship identification
  - Text summarization
- **UTCP Registration**: Registers tools as `distiller.process_text`, etc.