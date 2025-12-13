# Sovereign Tools Specification

## Identity
- **Name**: Sovereign Tools Suite
- **Role**: Portable, browser-native interface and inference layer for Context-Engine
- **Philosophy**: Zero-dependency (client-side), offline-capable, hardware-accelerated via WebGPU.

## Architecture Overview

The tools suite follows a **Browser-as-Backend** architecture, shifting heavy compute from local Python processes to the browser's WebGPU engine.

### 1. The Bridge (Inference Layer)
- **Component**: `webgpu_bridge.py`
- **Role**: OpenAI-compatible API Proxy
- **Protocol**: 
  - **Input**: HTTP/REST (`/v1/chat/completions`, `/v1/embeddings`)
  - **Output**: WebSocket (`ws://localhost:8080/ws/chat`, `ws://localhost:8080/ws/embed`)
- **Function**: Translates standard API calls into WebSocket messages sent to browser workers.

### 2. The Workers (Compute Layer)
- **Type**: Single-file HTML/JS applications
- **Engine**: `@mlc-ai/web-llm` (WebGPU)
- **Components**:
  - **Chat Worker** (`webgpu-server-chat.html`): Handles LLM inference (Llama 3, Qwen 2.5).
  - **Embed Worker** (`webgpu-server-embed.html`): Handles vector embeddings (Snowflake Arctic).
- **Capabilities**:
  - Full GPU offload via WebGPU.
  - Local caching of model weights.
  - Streaming response support.

### 3. The Interfaces (Sovereign UI)
- **Type**: Single-file HTML tools
- **Design**: Mobile-first, Tailscale-ready
- **Components**:
  - **Mobile Chat** (`mobile-chat.html`): Lightweight chat interface with SGR (Thinking) tag support.
  - **Log Viewer** (`log-viewer.html`): Real-time visualization of server logs via `GET /audit/server-logs`.

## Integration with ECE Core

The Sovereign Tools replace the traditional local LLM server stack:

1.  **Legacy Stack**: `start_llm_server.py` (Python/CUDA) -> ECE Core
2.  **Sovereign Stack**: `webgpu_bridge.py` (Python/FastAPI) <-> Browser Workers -> ECE Core

The ECE Core connects to `http://localhost:8080` as its `llm_api_base`, unaware that the inference is happening in a browser tab.

## Technical Requirements
- **Browser**: Chrome/Edge 113+ (WebGPU support)
- **Network**: Localhost (8080) for Bridge, Tailscale for Mobile UI.
- **Dependencies**: 
  - Python: `fastapi`, `uvicorn`, `websockets`
  - JS: `@mlc-ai/web-llm` (via CDN)
