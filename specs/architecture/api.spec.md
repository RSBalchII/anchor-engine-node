# API Specification (WebGPU Bridge)

**Status:** Production
**Component:** `tools/webgpu_bridge.py`

## Overview
The "Bridge" acts as a reverse-proxy, exposing the browser's WebLLM engine as an OpenAI-compatible API.

## Endpoints

### `POST /v1/chat/completions`
- **Format:** OpenAI Standard.
- **Flow:** 
  1. Client sends JSON to Python Bridge.
  2. Bridge forwards via WebSocket to `model-server-chat.html`.
  3. Browser computes response (WebGPU).
  4. Result streamed back to Bridge -> Client.

### `POST /v1/embeddings`
- **Format:** OpenAI Standard.
- **Flow:** Forwards to `webgpu-server-embed.html`.

### `POST /v1/shell/exec`
- **Purpose:** Neural Shell Protocol (The Hands). Executes arbitrary shell commands on host.
- **Format:** JSON `{ "cmd": "string" }`.
- **Response:** JSON `{ "stdout": "...", "stderr": "...", "code": 0 }`.
- **Security:** Strict Token Auth required. 30s timeout.

## WebSockets
- `/ws/chat`: Connection for Chat Worker.
- `/ws/embed`: Connection for Embedding Worker.

## Security
- **Token Auth:** `Authorization: Bearer <BRIDGE_TOKEN>` required.
- **Network:** Binds to random port (obfuscation) or `8000` (default).
