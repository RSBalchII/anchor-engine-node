# External Context Engine (ECE)

## Project Overview

The External Context Engine (ECE) is a sophisticated cognitive architecture designed to provide persistent memory and context management for AI systems. It is a Python-based project that utilizes a combination of technologies to create an intelligent memory management system with Q-Learning powered context retrieval.

## LLM Configuration

The ECE supports multiple LLM providers. The configuration for this is in the `config.yaml` file.

### Configuration Structure

The `llm` section of the `config.yaml` file has the following structure:

```yaml
llm:
  active_provider: ollama
  providers:
    ollama:
      model: "granite3.1-moe:3b-instruct-q8_0"
      api_base: "http://localhost:11434/v1"
    docker_desktop:
      model: "ai/mistral:latest"
      api_base: "http://localhost:12434/v1"
```

*   `active_provider`: This key specifies which provider to use. It can be either `ollama` or `docker_desktop`.
*   `providers`: This is a dictionary containing the configuration for each provider.
    *   `ollama`: Configuration for the Ollama provider with the `granite3.1-moe:3b-instruct-q8_0` model.
    *   `docker_desktop`: Configuration for the Docker Desktop OpenAI-compatible endpoint with the `ai/mistral:latest` model.

### Switching Providers (Manual Fallback)

To switch between providers, change the value of the `active_provider` key to the desired provider. For example, to use the Docker Desktop endpoint as a fallback, change the `active_provider` to `docker_desktop`:

```yaml
llm:
  active_provider: docker_desktop
  # ...
```

The core technologies used in this project are:

*   **Python:** The primary programming language.
*   **FastAPI:** A modern, fast (high-performance), web framework for building APIs with Python 3.7+ based on standard Python type hints.
*   **Docker:** For containerization and easy deployment.
*   **Neo4j:** A graph database used for knowledge representation.
*   **Redis:** An in-memory data structure store, used as a cache.
*   **PyTorch & Sentence Transformers:** For GPU-accelerated embedding generation and semantic search.
*   **Q-Learning:** A reinforcement learning algorithm used for optimal path finding in the knowledge graph.

The project is structured as a multi-agent system with different tiers of agents responsible for orchestration, thinking, and memory management.

## Building and Running

The project is designed to be run with Docker.

**To start the services:**

```bash
docker-compose up -d
```

**To initialize the database:**

```bash
docker-compose exec chimaera-dev python scripts/init_db.py
```

**To verify the health of the services:**

```bash
curl http://localhost:8000/health
```

## Development Conventions

### Development Environment

A development environment can be set up using a Python virtual environment.

**To set up the development environment:**

```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install -r requirements_dev.txt
```

### Running Tests

The project uses `pytest` for testing.

**To run the tests:**

```bash
pytest tests/
```

### Code Quality

The project uses `flake8` for linting, `mypy` for type checking, and `black` for code formatting.

**To run the code quality checks:**

```bash
flake8 src/
mypy src/
black src/
```

## Specifications

The `specs` directory contains the following documents:

*   `llm_configuration.md`: Details on the LLM provider configuration.
*   `plan.md`: The project plan.
*   `spec.md`: The project specification.
*   `tasks.md`: The current tasks.