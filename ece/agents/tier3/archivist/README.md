# Archivist Agent

The Archivist is the master controller of the Tier 3 Memory Cortex in the External Context Engine (ECE). It serves as the primary API gateway for external requests for context and acts as the central coordinator for all long-term memory operations.

## Overview

The Archivist agent manages the flow of information between the `Distiller`, the `Extractor`'s input, the `QLearningAgent`, and the `Injector`, ensuring the `Neo4j` knowledge graph remains coherent and accessible.

## Features

- External API gateway for context retrieval requests
- Coordination with QLearningAgent for querying the knowledge graph
- Integration with Distiller for receiving distilled summaries
- Communication with Injector for writing data to the knowledge graph
- Secure API endpoints with request/response validation
- Business logic for filtering and processing data from Distiller
- Sophisticated context synthesis logic for processing path data from QLearningAgent

## API Endpoints

- `GET /` - Root endpoint for health check
- `GET /health` - Health check endpoint
- `POST /context` - External API endpoint for context requests
- `POST /internal/data_to_archive` - Internal endpoint for receiving data from Distiller

## Requirements

- Python 3.11+
- FastAPI
- Uvicorn
- Pydantic
- httpx

## Usage

To run the Archivist agent:

```bash
cd /path/to/ece/agents/tier3/archivist
python archivist_agent.py
```

The agent will start on `http://localhost:8003`.

## Testing

To run the integration tests:

```bash
cd /path/to/ece/agents/tier3/archivist
python -m pytest test_archivist_integration.py -v
```

## Implementation Status

- [x] Project Scaffolding
- [x] External API Gateway
- [x] QLearningAgent Integration
- [x] Injector Integration
- [x] Distiller Integration
- [x] Context Synthesis
- [x] Injection Logic
- [x] End-to-End Testing
- [ ] Error Handling (Known issue with "'str' object is not callable" error that needs further investigation)