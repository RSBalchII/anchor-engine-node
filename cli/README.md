# ECE-CLI: External Context Engine Command-Line Interface

ECE-CLI is a command-line interface for interacting with the External Context Engine (ECE). It provides a rich terminal experience with syntax highlighting, markdown rendering, and persistent session management.

## Features

- **Rich Terminal Experience**: Beautiful formatting with syntax highlighting and markdown support
- **Persistent Sessions**: Session management with conversation history
- **Easy Configuration**: Simple configuration management for ECE endpoints
- **Command History**: Built-in command history and navigation
- **Error Handling**: Robust error handling with user-friendly messages

## Installation

```bash
pip install -e .
```

## Usage

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

## Configuration

The CLI reads configuration from `~/.config/ece-cli/config.json` or creates a default configuration if none exists.

## Architecture

The CLI follows a clean architecture with:

1. **ECEAPIClient**: Handles communication with the ECE orchestrator API
2. **OutputRenderer**: Formats responses with rich terminal output
3. **ConfigManager**: Manages CLI configuration
4. **ECECLI**: Main CLI application orchestrating all components

This architecture allows for easy testing, maintenance, and extensibility.