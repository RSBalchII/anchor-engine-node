# Anchor Core: Browser-Based Control Center & Vision Integration

## Overview

The Anchor Core now includes a browser-based control center that provides unified access to system functionality through two main interfaces:

1. **Sidecar Dashboard** (`http://localhost:8000/sidecar`) - Dual-tab interface for context retrieval and vision processing
2. **Context UI** (`http://localhost:8000/context`) - Manual context retrieval with scrollable display and copy functionality

## Components

### Vision Engine (`tools/vision_engine.py`)
- Python-powered Vision Language Model (VLM) integration
- Currently configured for Ollama backend with LLaVA model
- Handles image analysis and converts to text descriptions for memory storage

### Sidecar Dashboard (`tools/sidecar.html`)
- **Retrieve Tab**: Query the memory graph and retrieve context
- **Vision Tab**: Drag-and-drop image processing with VLM analysis
- Real-time processing logs

### Context UI (`tools/context.html`)
- Manual context retrieval interface
- Scrollable text display for reviewing context
- One-click copy functionality for pasting into other tools

## Setup

### Prerequisites
1. Ensure Ollama is installed and running:
   ```bash
   ollama serve
   ```

2. Pull a vision model (e.g., LLaVA):
   ```bash
   ollama pull llava
   ```

### Launch
1. Start the Anchor Core:
   ```bash
   start-anchor.bat
   ```

2. Access the interfaces:
   - Sidecar: `http://localhost:8000/sidecar`
   - Context UI: `http://localhost:8000/context`

## Usage

### Context Retrieval
1. Open `http://localhost:8000/context`
2. Enter a query in the search field (e.g., "Project Specs")
3. Click "Fetch Context" to retrieve relevant information
4. Review the context in the scrollable text area
5. Click "📋 Copy to Clipboard" to copy the context for use elsewhere

### Vision Processing
1. Open `http://localhost:8000/sidecar`
2. Go to the "Vision" tab
3. Drag and drop an image or click to upload
4. The image will be processed by the VLM
5. Results will be stored in the memory graph automatically

### Memory Search
1. Use the "Retrieve" tab in the sidecar
2. Enter your query and click "Fetch Context"
3. Copy the results to use in other applications

## Endpoints

- `GET /sidecar` - Serve the sidecar dashboard
- `GET /context` - Serve the context UI
- `POST /v1/vision/ingest` - Process uploaded images with VLM
- `POST /v1/memory/search` - Search the memory graph

## Architecture

The system follows a unified architecture where:
- The WebGPU Bridge (`webgpu_bridge.py`) serves UI files and orchestrates components
- Vision processing happens in Python via the Vision Engine
- Memory storage uses the graph database
- Communication between components happens via WebSockets