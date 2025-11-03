# External Context Engine (ECE) - Project Overview

## Project Description

The External Context Engine (ECE) is a sophisticated cognitive architecture designed to provide persistent memory and context management for AI systems. It's an advanced agentic system that enables AI applications to maintain long-term relationships, recall past conversations, and build coherent narratives from fragmented knowledge. The system is designed to operate entirely on local hardware without cloud dependencies.

## Architecture Overview

The ECE implements a multi-tiered agent architecture:

- **Tier 1**: Orchestrator Agent - Central coordinator that routes prompts to appropriate agents
- **Tier 2**: Tool Agents - Specialized agents like WebSearchAgent and FileSystemAgent
- **Tier 3**: Memory Cortex - Core memory management agents including:
  - ArchivistAgent: Central coordinator for knowledge graph operations
  - QLearningAgent: Reinforcement learning for optimal path finding in the knowledge graph
  - DistillerAgent: Processes raw text to extract structured information
  - InjectorAgent: Optimizes the knowledge graph through reinforcement learning

### Core Technologies
- **LLM Integration**: Supports multiple providers (Ollama, llama.cpp, Docker Desktop)
- **Knowledge Graph**: Neo4j for persistent memory storage
- **Caching**: Redis-based context cache with 32GB allocation
- **Framework**: FastAPI for web services
- **Communication**: UTCP (Universal Tool Calling Protocol) for tool discovery and execution

## Key Features

### Intelligent Memory Management
- **Archivist Agent**: Central coordinator for knowledge graph operations
- **QLearning Agent**: Reinforcement learning for optimal path finding
- **Context Cache**: Redis-based caching.
- **Token-Aware Summarization**: Processes large amounts of context.

### Enhanced Context Retrieval
- **Keyword-Based Querying**: Extracts keywords for targeted memory retrieval
- **Semantic Search**: Vector similarity search using Sentence Transformers
- **Path Finding**: Q-Learning optimized traversal of knowledge graph
- **Context Summarization**: Token-aware summarization within LLM limits
- **Local Web Search**: DuckDuckGo-based search with local scraping, no external API required

### Local-First and Performant
- **Local Execution**: Runs entirely on local hardware without cloud dependencies.
- **Script-based**: Uses simple scripts for launching and managing agents.
- **Memory Management**: Includes a configurable memory limiter for Windows to prevent crashes.
- **GPU Acceleration**: Supports CUDA for accelerated embedding generation.

## Markovian Thinking Architecture

The ECE implements a sophisticated reasoning system called "Markovian Thinking":
- **Chunked Reasoning**: Processes information in fixed-size context windows
- **Dual-LLM PEVG Model**: Uses a Primary LLM (Generator) and TRM Service (Executor/Verifier)
- **Iterative Refinement**: Implements "propose -> critique -> refine" loops via specialized TRM service
- **Textual Carryover**: Maintains context between chunks with concise summaries

## Model Management System

The ECE features a unified model proxy system that routes between the External Context Engine and standalone llama.cpp models, allowing a unified interface to both systems. The ModelManager class handles on-demand model execution including starting, stopping, and switching between different models, with automatic port assignment for model servers.

## Externalized Memory & Context Management

The ECE implements a sophisticated multi-tiered context management system that preserves identity and memory external to any model:
- **POML/JSON Persona Loading**: POML/JSON persona files (e.g., orchestrator.json) are loaded FIRST before ANY response processing begins, establishing foundational identity, protocols, values, and operational context
- **Redis Context Loading & Archivist Processing**: Redis context is loaded and the Archivist receives the prompt to send keywords to the QLearning agent for relevant context retrieval
- **QLearning & Archivist Context Enhancement**: QLearning returns potentially large amounts of context which the Archivist uses a system LLM to summarize and identify important contextual information, then appends it to the Redis cache
- **Temporal Memory**: Continuous temporal scanning protocol with the Archivist Agent maintains chronological records in Neo4j knowledge graph
- **Orchestrator Processing**: The Orchestrator reads the enhanced Redis cache (always including POML persona first) and processes the complete context
- **Tool Integration**: Tool outputs (web search, file read/write, etc.) become part of the accessible context

## UTCP Implementation

The ECE now fully implements the Universal Tool Calling Protocol (UTCP) 1.0+ specification using a decentralized architecture:

- Each service serves its own UTCP Manual at the standard `/utcp` endpoint
- The orchestrator connects directly to individual service endpoints rather than a centralized registry
- Services include: Distiller (port 8001), QLearning (port 8002), Archivist (port 8003), Injector (port 8004), FileSystem (port 8006), and WebSearch (port 8007)

This decentralized approach provides better reliability, scalability, and eliminates single points of failure.

## Infrastructure

### Docker Configuration
The ECE uses Docker containers for infrastructure services:
- Neo4j: Version 5, running on ports 7474 (HTTP) and 7687 (Bolt)
- Redis: RedisSearch image, running on port 6379

### Configuration Management
The ECE supports configuration through both environment variables and a config.yaml file. Environment variables take precedence over config file values when both are present. The configuration system supports multiple LLM providers (llama_cpp, ollama, docker_desktop) and includes settings for memory limits, ports, and other system parameters.

## Building and Running

### Prerequisites
- Python 3.11+
- Neo4j database
- Redis server
- CUDA-compatible GPU (for GPU acceleration)

### Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Configure environment: Create `.env` file with Neo4j and Redis connection details
3. Configure LLM provider in `config.yaml`

### Running the System
The ECE offers multiple startup options:
1. Simplified ecosystem startup using `python start_simplified_ecosystem.py`
2. Individual agent startup for development purposes
3. Docker-based deployment for production environments

## Core Capabilities

- **Intelligent Memory Management**: Q-Learning powered context retrieval
- **Enhanced Context Retrieval**: Semantic search and path finding in knowledge graph
- **Local-First Execution**: Runs entirely on local hardware without cloud dependencies
- **Script-Based Management**: Simple scripts for launching and managing agents
- **Memory Optimization**: Configurable memory limiter for Windows systems
- **GPU Acceleration**: CUDA support for accelerated embedding generation
- **On-Demand Model Execution**: ModelManager starts models only when needed
- **Model Lifecycle Management**: Automatic start/stop of models to save resources
- **UTCP Integration**: Universal Tool Calling Protocol for tool discovery and execution
- **Markovian Thinking**: Chunked reasoning with textual carryover for deep local reasoning

## Development Guidelines

The ECE project follows a strict documentation policy to maintain organization and clarity. Only specific markdown files are permitted:
- `README.md` and `QWEN.md` in the root directory
- All markdown files in the `specs/` directory

## Troubleshooting

Common issues include:
- Port conflicts (especially with file system agent at port 8006)
- Docker service availability for Neo4j and Redis
- Model server startup issues
- UTCP endpoint connectivity problems

The system includes comprehensive logging to the `logs/` directory for debugging purposes, with separate log files for ecosystem, model inference, and orchestrator operations.