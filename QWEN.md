# External Context Engine (ECE) - Complete Project Overview

## Project Overview

The External Context Engine (ECE) is a sophisticated cognitive architecture designed to provide persistent memory and intelligent context management for AI systems. The system integrates multiple AI agents with a Neo4j knowledge graph and reinforcement learning components to create an intelligent context manager that enables AI systems to think over time. The ECE is built with Python using FastAPI framework and follows a three-tier agent architecture with UTCP (Universal Tool Calling Protocol) integration.

## Architecture Overview

The ECE follows a three-tier architecture with specialized agents at each level:

### Tier 1: Orchestrator
- **Orchestrator Agent**: The central coordinator that routes prompts to appropriate agents and manages the overall flow using a decision tree for transparent reasoning. It provides a FastAPI-based REST interface for client interactions.

### Tier 2: Thinkers
- **Thinker Agents**: Specialized reasoning agents that provide different perspectives (Optimist, Pessimist, Creative, Analytical, Pragmatic)
- **Synthesis Agent**: Combines multiple perspectives into a coherent analysis

### Tier 3: Memory Cortex
- **Archivist Agent**: Master controller of the memory cortex that manages knowledge graph operations
- **QLearning Agent**: Reinforcement learning agent for optimal path finding in the knowledge graph
- **Distiller Agent**: Processes raw text to extract structured information for storage
- **Injector Agent**: Persists structured data to the Neo4j knowledge graph

## Key Components

### Q-Learning Agent
The QLearningAgent uses reinforcement learning to navigate and optimize the Neo4j knowledge graph. It maintains a Q-table representing learned pathways and relationships within the graph, with features:
- Neo4j integration for graph traversal
- Q-learning algorithm implementation with configurable parameters
- State and action space based on graph nodes and relationships
- Reward system for contextual information retrieval

### UTCP (Universal Tool Calling Protocol)
- **UTCP Tool Registry**: Central service for tool discovery and registration
- **UTCP Client**: Standardized client library for discovering and calling tools
- Standardized tool definitions that replace bespoke wrapper APIs
- Centralized tool discovery across all ECE capabilities

### Context Management
- **Redis-based Context Cache**: For high-performance short-term context storage
- **Neo4j Knowledge Graph**: For structured long-term memory storage
- Context preservation and coherence across interactions
- Cohesion Loop for maintaining short-term continuity

### LLM Integration
- Integration with Ollama for local LLM inference
- Configurable LLM providers and models
- Schema-guided reasoning with decision trees

## Building and Running

### Prerequisites
- Python 3.12+
- Docker and Docker Compose
- NVIDIA GPU with CUDA 12.1 support (recommended)
- Neo4j database
- Redis server

### Installation
```bash
# Clone the repository
git clone https://github.com/chimaera-multi-modal-agent/External-Context-Engine-ECE.git
cd External-Context-Engine-ECE

# Navigate to the main project directory
cd External-Context-Engine-ECE  # There's a nested directory with the same name

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Install Python dependencies
pip install -r requirements.txt

# Or use uv for faster installation
uv pip install -r requirements.txt
```

### Running the Application
```bash
# Start services with Docker Compose
docker-compose up -d

# Run the orchestrator service directly
python app.py

# Or run with uvicorn for development
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Using the ECE Client
```bash
# Run the interactive ECE client
python ece_client.py
```

### API Endpoints
- `GET /`: Health check for Orchestrator
- `GET /health`: Detailed health status
- `GET /v1/models`: Placeholder endpoint to mimic Ollama models endpoint
- `GET /process_prompt`: Process a user prompt using the Orchestrator
- `GET /get_analysis_result`: Retrieve the result of a complex reasoning analysis

## Project Structure

```
External-Context-Engine-ECE/
├── app.py                          # Main FastAPI application for Orchestrator
├── config.yaml                     # Main system configuration
├── docker-compose.yml              # Docker Compose configuration
├── Dockerfile                     # Docker image definition
├── ece_client.py                  # Headless ECE client
├── requirements.txt               # Python dependencies
├── .env                          # Environment variables
├── ece/                          # Main ECE source code
│   ├── agents/                   # Agent implementations
│   │   ├── tier1/                # Orchestrator agents
│   │   │   └── orchestrator/    # Main Orchestrator implementation
│   │   ├── tier2/               # Thinker agents
│   │   └── tier3/               # Memory cortex agents
│   │       ├── archivist/       # Archivist agent
│   │       ├── distiller/       # Distiller agent
│   │       ├── injector/        # Injector agent
│   │       └── qlearning/       # QLearning agent
│   ├── components/               # Core components
│   │   └── context_cache/       # Redis-based context cache
│   └── common/                  # Shared utilities
├── specs/                        # Specification documents
├── scripts/                      # Utility scripts
├── tests/                        # Test suite
├── utcp_client/                  # UTCP client library
├── utcp_registry/                # UTCP tool registry service
├── cli/                         # ECE Command-Line Interface
└── poml/                        # POML persona files
```

## Configuration

The system uses both `config.yaml` for main configuration and environment variables from `.env` for sensitive settings:

- `TAVILY_API_KEY`: API key for Tavily web search
- `OLLAMA_BASE_URL`: URL for Ollama LLM service
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`: Neo4j database connection
- `REDIS_URL`: Redis cache connection URL
- `ECE_ORCHESTRATOR_URL`: URL for the orchestrator service

## Key Features

1. **Intelligent Memory Management**: Using Archivist Agent and QLearning Agent for optimal knowledge graph operations
2. **Multi-Agent Reasoning**: Specialized thinker agents providing different perspectives on queries
3. **UTCP Integration**: Standardized tool discovery and calling across all agents
4. **Context Coherence**: Short-term and long-term memory systems working together
5. **GPU Acceleration**: Optimized for CUDA-enabled GPUs for enhanced performance
6. **FastAPI Interface**: REST API for easy integration with other systems
7. **Rich CLI Client**: Interactive terminal interface with markdown support

## Development Conventions

- Follow Python PEP 8 coding standards
- Use Pydantic for configuration and data validation
- Implement rich terminal output for all user-facing content
- Follow clean architecture with separated concerns
- Use asynchronous programming for API calls to maintain responsiveness
- Write comprehensive tests for all functionality
- Use the Literate Commenting Protocol: every non-trivial line or logical block of code MUST be preceded by a comment explaining its purpose

## Dependencies

Key dependencies include:
- fastapi==0.116.1
- uvicorn==0.35.0
- python-dotenv==1.1.1
- neo4j==5.28.2
- redis (via Python redis library)
- httpx==0.28.1
- pydantic==2.11.7
- pydantic-settings==2.10.1
- rich==14.1.0
- numpy==2.3.2
- ollama==0.5.3
- docker==7.1.0
- sentence-transformers
- torch (for CUDA support)
- tavily-python (for web search capabilities)

## Testing

```bash
# Run tests
pytest tests/

# Run unit tests
pytest tests/unit/

# Run integration tests
pytest tests/integration/

# Run with coverage
pytest --cov=src tests/
```

## Docker Support

The project includes full Docker support with:
- CUDA-enabled base image for GPU acceleration
- Docker Compose for service orchestration
- Volume mounts for development
- Neo4j and Redis services

## UTCP Tool Definition Schema

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

## Data Flows

### 1. Context Retrieval Flow
- Ingestion: Orchestrator receives prompt from client
- Universal Routing: Routes to Archivist via UTCP for context retrieval
- Graph Query: Archivist queries QLearningAgent for relevant context
- Context Summarization: Archivist summarizes relevant context
- Context Injection: Returns enriched context to Orchestrator
- Enriched Execution: Orchestrator routes to appropriate agent with context

### 2. Complex Reasoning Flow
- Initiation: Orchestrator starts async reasoning task
- Synthesis: Synthesizer processes outputs from Thinker agents
- Result Storage: Stores final analysis in Redis cache
- Client Retrieval: Client polls for completed analysis

### 3. Memory Preservation Flow
- Periodic Scan: Archivist performs "tail read" on Redis cache
- Pre-emptive Archiving: Sends oldest context to Injector agent
- Graph Solidification: Injector writes to Neo4j knowledge graph

## Performance Metrics

- Context Retrieval: < 2 seconds for graphs under 10K nodes
- Memory Storage: < 100ms for single concept insertion
- Path Finding: < 500ms with GPU acceleration
- Context Building: < 200ms for 4K token summaries
- Cache Hit Rate: > 80% with adequate allocation

## Command-Line Interface

The `ece_client.py` file provides a rich command-line interface with:
- Rich terminal experience with syntax highlighting and markdown support
- Persistent session management
- Built-in command history
- Robust error handling with user-friendly messages
- Asynchronous processing with status indicators