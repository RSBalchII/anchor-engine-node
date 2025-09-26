# ECE-CLI: External Context Engine Command-Line Interface

## Project Overview

ECE-CLI is a command-line interface for interacting with the External Context Engine (ECE). It provides a rich terminal experience with syntax highlighting, markdown rendering, and persistent session management. The CLI serves as a user-friendly interface to interact with the ECE's sophisticated cognitive architecture, which includes memory management, multi-agent reasoning, and AI integration.

### Key Features

- **Rich Terminal Experience**: Beautiful formatting with syntax highlighting and markdown support using the `rich` library
- **Persistent Sessions**: Session management with conversation history stored in `~/.config/ece-cli/history.json`
- **Easy Configuration**: Simple configuration management with automatic config file creation at `~/.config/ece-cli/config.json`
- **Command History**: Built-in command history and navigation
- **Error Handling**: Robust error handling with user-friendly messages
- **API Integration**: Seamless communication with the ECE orchestrator API
- **Async Processing**: Non-blocking API calls with status indicators during processing

### Architecture

The CLI follows a clean architecture with these key components:

1. **ECEAPIClient**: Handles asynchronous communication with the ECE orchestrator API
2. **ECECLI**: Main CLI application orchestrating all components
3. **ECEConfig**: Configuration model using Pydantic for validation
4. **Output Display**: Rich terminal output formatting with markdown support

This architecture allows for easy testing, maintenance, and extensibility.

## Building and Running

### Prerequisites
- Python 3.10+ (as specified in `pyproject.toml`)
- pip package manager

### Installation
```bash
cd /home/rsbiiw/Gemini/ECE/External-Context-Engine-ECE/cli
pip install -e .
```

Alternatively, using uv (as indicated by the presence of `uv.lock`):
```bash
cd /home/rsbiiw/Gemini/ECE/External-Context-Engine-ECE/cli
uv sync
uv run ece-cli
```

### Usage
```bash
ece-cli
```

Once in the CLI, you can:
- Type any message to interact with the ECE
- Use `/help` to see available commands
- Use `/config` to view current configuration
- Use `/health` to check ECE orchestrator status
- Use `/exit` or `/quit` to exit

## Commands

| Command | Description |
|---------|-------------|
| `/help` | Show help information |
| `/config` | Show current configuration |
| `/health` | Check ECE orchestrator health |
| `/exit` or `/quit` | Exit the CLI |

## Dependencies

The project depends on several key libraries:

- `httpx>=0.24.0`: For making asynchronous HTTP requests to the ECE API
- `rich>=13.0.0`: For rich terminal formatting and markdown display
- `pydantic>=1.8.0`: For data validation and settings management
- `click>=8.0.0`: For command-line interface creation
- `pyyaml>=6.0`: For YAML configuration file processing

## Configuration

The CLI reads configuration from `~/.config/ece-cli/config.json` or creates a default configuration if none exists. This configuration includes:

- `ece_base_url`: URL of the ECE orchestrator API (defaults to "http://localhost:8000")
- `timeout`: Request timeout in seconds (defaults to 30)
- `history_size`: Number of conversation entries to keep (defaults to 100)

## Implementation Details

The `ece_cli.py` module implements:

- **ECEConfig**: A Pydantic model for configuration validation
- **ECEAPIClient**: Handles communication with the ECE orchestrator API
- **ECECLI**: Main CLI application class with history management, command processing, and response display
- **main()**: The entry point function that runs the CLI loop

The CLI uses asyncio for non-blocking API calls and provides a responsive user experience with status indicators during processing.

## Development Conventions

- Follow Python PEP 8 coding standards
- Use Pydantic for configuration and data validation
- Implement rich terminal output for all user-facing content
- Follow clean architecture principles with separate concerns
- Use asynchronous programming for API calls to maintain responsiveness
- Write comprehensive tests for all functionality

## Project Context

This CLI is part of the larger External Context Engine (ECE) project, which is a sophisticated cognitive architecture designed to provide persistent memory and context management for AI systems. The ECE includes:

- **Tier 1: Orchestrator**: Central coordinator routing prompts to appropriate agents
- **Tier 2: Thinkers**: Specialized reasoning agents (Optimist, Pessimist, Creative, Analytical, Pragmatic)
- **Tier 3: Memory Cortex**: Knowledge graph operations with Archivist, QLearning, Distiller, and Injector agents

The CLI provides a direct interface to interact with this complex system from the terminal.