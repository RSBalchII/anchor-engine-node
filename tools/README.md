# Sovereign Tools & WebGPU Bridge

This directory contains a suite of lightweight, portable tools designed to decouple the Context-Engine from heavy local Python dependencies and enable "Sovereign" operation using browser-based WebGPU inference.

## Components

### 1. WebGPU Bridge System
Replaces the heavy `llama-cpp-python` server with a lightweight bridge that offloads inference to your browser.

*   **`webgpu_bridge.py`**: A FastAPI server (Port 8080) that mimics the OpenAI API. It receives requests from ECE and forwards them to browser tabs via WebSockets.
*   **`webgpu-server-chat.html`**: The Chat Worker. Opens in a browser tab, loads the LLM (e.g., Llama 3, Qwen 2.5) via WebGPU, and processes requests from the bridge.
*   **`webgpu-server-embed.html`**: The Embedding Worker. Opens in a browser tab, loads the embedding model (Snowflake Arctic), and processes vectorization requests.

### 2. Sovereign Interfaces
Standalone HTML tools for interacting with the system.

*   **`mobile-chat.html`**: A mobile-optimized chat interface. Connects directly to the ECE API (or the Bridge). Supports `<think>` tags and SGR parsing.
*   **`log-viewer.html`**: A visual log viewer that polls the ECE audit logs (`/audit/server-logs`) for real-time debugging.
*   **`webgpu-chat.html`**: A completely standalone offline chat tool (no backend required).

## Quick Start: Running the Sovereign Stack

To run the Context-Engine using the browser as your backend:

### Step 1: Start the Bridge
Run the lightweight Python bridge:
```bash
python tools/webgpu_bridge.py
```
*Listens on `http://localhost:8080`*

### Step 2: Start the Workers
1.  Open `tools/webgpu-server-chat.html` in Chrome or Edge.
2.  Select your model (e.g., **Qwen 2.5 7B**) and click **Load Model & Connect**.
3.  Open `tools/webgpu-server-embed.html` in a new tab.
4.  Click **Start Server** to load the embedding model.

### Step 3: Connect ECE
Configure your ECE `config.yaml` (or environment variables) to point to the bridge:
```yaml
llm_api_base: "http://localhost:8080/v1"
embedding_api_base: "http://localhost:8080/v1"
```

## Supported Models

The WebGPU workers support MLC-compiled models. Common options include:
*   **Llama 3.1 8B Instruct** (Balanced performance)
*   **Qwen 2.5 7B Instruct** (High quality, good reasoning)
*   **Qwen 2.5 Coder 1.5B** (Fast, good for code)
*   **DeepSeek R1 Distill** (Reasoning capabilities)
*   **Snowflake Arctic Embed** (For embeddings)

*Custom models can be added by providing their Hugging Face MLC repo ID.*

## Requirements

*   **Browser**: Chrome 113+, Edge 113+, or other browsers with WebGPU enabled.
*   **GPU**: A GPU compatible with WebGPU (most modern dedicated and integrated GPUs).
*   **Python Dependencies**:
    ```bash
    pip install fastapi uvicorn websockets
    ```
