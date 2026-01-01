# Tools Directory

Contains the browser-native HTML/JS applications (Console, Builder, Mic) and the Python WebGPU bridge for the Sovereign Context Engine.

## Core Components

- `webgpu_bridge.py` - The unified bridge serving UI, API, and orchestrating system components
- `anchor.py` - Native terminal client for the Anchor system
- `orchestrator.py` - Component orchestration logic

## Vision and AI Components

- `vision_engine.py` - Python-powered Vision Language Model (VLM) integration for image analysis
- `modules/` - JavaScript modules for the browser-based kernel

## UI Components

- `sidecar.html` - Browser-based control center with dual tabs for context retrieval and vision ingestion
- `context.html` - Manual context retrieval UI with scrollable display and one-click copy functionality
- `log-viewer.html` - Centralized log viewer for system diagnostics

## Vision and AI Components

- `vision_engine.py` - Python-powered Vision Language Model (VLM) integration for image analysis
- `modules/` - JavaScript modules for the browser-based kernel
- `chat.html` - Main chat interface for interacting with WebGPU-powered LLMs
- `terminal.html` - Web-based terminal interface
- `anchor-mic.html` - Audio input interface
- `memory-builder.html` - Memory management interface
- `db_builder.html` - Database builder interface

## Test Files

- `test_model_loading.py` - Model loading functionality tests
- `test_model_availability.py` - Model availability verification tests
- `test_orchestrator.py` - Orchestrator component tests

## Usage

### Browser-Based Control Center
1. Start the Anchor Core with `start-anchor.bat`
2. Access the sidecar at `http://localhost:8000/sidecar`
3. Access the context UI at `http://localhost:8000/context`

### Vision Integration
1. Ensure Ollama is running with a VLM model (e.g., `ollama pull llava`)
2. Upload images via the Vision tab in the sidecar
3. Images will be processed and stored in the memory graph

### GPU Resource Management
The system now includes automatic GPU resource queuing to prevent conflicts:
- All GPU operations go through the queuing system automatically
- When GPU is busy, requests wait in queue rather than failing
- Monitor GPU status at `http://localhost:8000/v1/gpu/status`
- GPU operations include: model loading, inference, and vision processing
