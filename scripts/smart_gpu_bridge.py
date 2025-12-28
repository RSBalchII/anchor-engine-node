#!/usr/bin/env python3
"""
Smart GPU Bridge with Hot Reload Capability
This script runs the WebGPU bridge with automatic reloading when files change
"""

import asyncio
import uvicorn
import json
import uuid
import os
import time
import threading
from collections import deque
from fastapi import FastAPI, WebSocket, Request, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import importlib
import sys
from pathlib import Path
import hashlib
import requests
from fastapi.staticfiles import StaticFiles
from download_models import download_model

# Configuration
MODELS_DIR = Path("models").resolve()
MODELS_DIR.mkdir(exist_ok=True)
download_status = {}


# Import the PriorityGPUManager from the main bridge file
import sys
import os
# Add the tools directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'tools'))

from webgpu_bridge import PriorityGPUManager, gpu_lock, log

# Global variable to track file hashes for hot reload
file_hashes = {}
reload_lock = threading.Lock()

# Global state for shell persistence
SHELL_STATE = {
    "cwd": os.getcwd()
}

def get_file_hash(filepath):
    """Calculate MD5 hash of a file"""
    try:
        with open(filepath, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
    except:
        return None

def check_for_changes():
    """Check if any GPU-related files have changed"""
    # Get the project root directory (two levels up from script location)
    project_root = Path(__file__).parent.parent
    gpu_files = [
        str(project_root / "tools/webgpu_bridge.py"),
        str(project_root / "tools/modules/sovereign.js"),
        str(project_root / "tools/model-server-chat.html"),
        str(project_root / "tools/root-mic.html"),
        str(project_root / "tools/root-dreamer.html")
    ]
    
    changed = False
    for file_path in gpu_files:
        full_path = Path(file_path)
        if full_path.exists():
            current_hash = get_file_hash(full_path)
            # Use the relative path as the key to keep the UI clean
            relative_path = str(full_path.relative_to(Path(__file__).parent.parent))
            if relative_path not in file_hashes:
                file_hashes[relative_path] = current_hash
            elif file_hashes[relative_path] != current_hash:
                print(f"🔄 Detected change in {relative_path}")
                file_hashes[relative_path] = current_hash
                changed = True

    return changed

def hot_reload_bridge():
    """Perform hot reload of bridge logic"""
    with reload_lock:
        print("🔄 Hot reloading bridge logic...")
        
        # Force release all GPU locks to prevent stale state
        gpu_lock.force_release_all()
        
        # Reload the module if possible
        try:
            importlib.reload(sys.modules['tools.webgpu_bridge'])
            print("✅ Bridge logic reloaded")
        except Exception as e:
            print(f"⚠️  Could not reload module: {e}")
            print("💡 Changes will take effect on next restart")

class FileWatcherThread(threading.Thread):
    """Thread to watch for file changes and trigger hot reloads"""
    def __init__(self):
        super().__init__()
        self.daemon = True
        self.running = True
    
    def run(self):
        while self.running:
            if check_for_changes():
                hot_reload_bridge()
            time.sleep(2)  # Check every 2 seconds

import subprocess

def create_app():
    """Create and configure the FastAPI application"""
    app = FastAPI(title="WebGPU Bridge - Hot Reload Enabled")
    
    # ... (existing middleware)

    # --- Neural Shell Protocol (The Hands) ---
    @app.post("/v1/shell/exec")
    async def shell_exec(request: Request):
        try:
            body = await request.json()
            cmd = body.get("cmd", "")
            
            if not cmd:
                return JSONResponse(status_code=400, content={"error": "No command provided"})

            log(f"💻 SHELL EXEC: {cmd} (in {SHELL_STATE['cwd']})")

            # Handle 'cd' manually since subprocess is ephemeral
            if cmd.strip().lower().startswith("cd "):
                target_dir = cmd.strip().split(" ", 1)[1].strip().strip('"')
                # Handle absolute vs relative paths
                new_path = os.path.abspath(os.path.join(SHELL_STATE['cwd'], target_dir))
                
                if os.path.exists(new_path) and os.path.isdir(new_path):
                    SHELL_STATE['cwd'] = new_path
                    return {
                        "stdout": f"Changed directory to: {new_path}",
                        "stderr": "",
                        "code": 0,
                        "cmd": cmd
                    }
                else:
                    return {
                        "stdout": "",
                        "stderr": f"The system cannot find the path specified: {new_path}",
                        "code": 1,
                        "cmd": cmd
                    }

            # Run the command with persistence
            # Input="" prevents hanging on interactive commands
            if os.name == 'nt':
                full_cmd = f'powershell -Command "{cmd}"'
            else:
                full_cmd = cmd

            proc = subprocess.run(
                full_cmd, 
                shell=True, 
                capture_output=True, 
                text=True, 
                input="", 
                cwd=SHELL_STATE['cwd'], 
                timeout=30
            )

            return {
                "stdout": proc.stdout,
                "stderr": proc.stderr,
                "code": proc.returncode,
                "cmd": cmd
            }
        except subprocess.TimeoutExpired:
            log(f"❌ Shell Timeout: {cmd}")
            return JSONResponse(status_code=408, content={"error": "Command timed out (30s limit)"})
        except Exception as e:
            log(f"❌ Shell Error: {e}")
            return JSONResponse(status_code=500, content={"error": str(e)})

    # --- Model Management (On-Demand Download) ---
    # Custom StaticFiles class to prevent cache headers that trigger browser Cache API
    class NoCacheStaticFiles(StaticFiles):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)

        async def __call__(self, scope, receive, send):
            # Call the parent implementation
            from starlette.staticfiles import StaticFiles
            # We need to set no-cache headers to prevent browser from using Cache API
            async def send_wrapper(message):
                if message['type'] == 'http.response.start':
                    # Add no-cache headers to prevent browser from using Cache API
                    headers = message.get('headers', [])
                    headers.extend([
                        (b"Cache-Control", b"no-store, no-cache, must-revalidate, proxy-revalidate"),
                        (b"Pragma", b"no-cache"),
                        (b"Expires", b"0"),
                    ])
                    message['headers'] = headers
                await send(message)

            await super().__call__(scope, receive, send_wrapper)

    app.mount("/models", NoCacheStaticFiles(directory="models"), name="models")

    def download_model_task(model_id: str, repo_url: str):
        """Background task to download model files using shared module"""
        try:
            download_status[model_id] = {"status": "downloading", "progress": "0%", "file": "starting..."}
            
            def progress_callback(msg, p):
                download_status[model_id].update({
                    "progress": f"{int(p*100)}%",
                    "file": msg
                })

            download_model(model_id, repo_url=repo_url, base_dir=MODELS_DIR, progress_callback=progress_callback)
            
            download_status[model_id] = {"status": "done", "progress": "100%", "file": "ready"}
            log(f"✅ Model {model_id} Ready")
            
        except Exception as e:
            log(f"❌ Download Failed: {e}")
            download_status[model_id] = {"status": "error", "error": str(e)}

    @app.post("/v1/models/pull")
    async def pull_model(request: Request):
        body = await request.json()
        model_id = body.get("model_id")
        url = body.get("url") # e.g. https://huggingface.co/mlc-ai/Qwen...
        
        if not model_id or not url:
            raise HTTPException(status_code=400, detail="Missing model_id or url")

        # Strip prefix if present in ID for directory name
        if "/" in model_id:
             model_id = model_id.split("/")[-1]

        if model_id in download_status and download_status[model_id]["status"] == "downloading":
            return {"status": "already_downloading"}
        
        # Check if already exists on disk
        if (MODELS_DIR / model_id / "ndarray-cache.json").exists():
             download_status[model_id] = {"status": "done", "progress": "100%", "file": "cached"}
             return {"status": "cached"}

        threading.Thread(target=download_model_task, args=(model_id, url)).start()
        return {"status": "started", "id": model_id}

    @app.get("/v1/models/pull/status")
    async def pull_status(id: str):
        if "/" in id: id = id.split("/")[-1]
        return download_status.get(id, {"status": "unknown"})


    # Add the hot reload endpoint
    @app.post("/v1/hot-reload")
    async def hot_reload_endpoint(request: Request):
        """Endpoint to manually trigger hot reload"""
        hot_reload_bridge()
        return {"status": "hot_reload_triggered"}

    # MOVED CORS MIDDLEWARE TO END TO WRAP EVERYTHING


    # Store active WebSocket connections
    workers: Dict[str, WebSocket] = {
        "chat": None,
        "embed": None
    }

    # Store pending response futures
    active_requests: Dict[str, asyncio.Queue] = {}

    # --- GPU Priority Manager (The Traffic Cop) ---
    # Using the imported gpu_lock from webgpu_bridge.py

    @app.post("/v1/gpu/lock")
    async def acquire_gpu_lock(request: Request):
        body = await request.json()
        requester = body.get("id", "unknown")
        # Use the imported gpu_lock
        success, token = await gpu_lock.acquire(requester, timeout=120.0)  # 2-minute timeout

        if success:
            return {"status": "acquired", "token": token}
        else:
            return JSONResponse(
                status_code=503,
                content={"status": "timeout", "msg": "GPU Queue Timeout"}
            )

    @app.post("/v1/gpu/unlock")
    async def release_gpu_lock(request: Request):
        body = await request.json()
        requester = body.get("id", "unknown")
        gpu_lock.release(requester)
        return {"status": "released"}

    @app.post("/v1/gpu/reset")
    async def reset_gpu_lock():
        gpu_lock.release("admin", force=True)
        return {"status": "reset"}

    @app.post("/v1/gpu/force-release-all")
    async def force_release_all_gpu_locks():
        """Emergency endpoint to clear all GPU locks and queues"""
        gpu_lock.force_release_all()
        return {"status": "all_gpu_locks_force_released"}

    @app.get("/v1/gpu/status")
    async def gpu_status():
        return gpu_lock.get_status()

    # Add the hot reload endpoint
    @app.post("/v1/hot-reload")
    async def hot_reload_endpoint(request: Request):
        """Endpoint to manually trigger hot reload"""
        hot_reload_bridge()
        return {"status": "hot_reload_triggered"}

    # --- Hot Reload File Monitoring Endpoint ---
    @app.get("/file-mod-time")
    async def get_file_mod_time(path: str):
        """
        Returns the modification time of a file relative to project root.
        Used by tools/modules/gpu-hot-reloader.js to detect changes.
        """
        try:
            # Security: Prevent directory traversal
            if ".." in path or path.startswith("/") or "\\" in path:
                raise HTTPException(status_code=400, detail="Invalid path")
            
            # Resolve against project root
            project_root = Path(__file__).parent.parent
            file_path = project_root / path
            
            if not file_path.exists():
                raise HTTPException(status_code=404, detail="File not found")
                
            return {"mtime": file_path.stat().st_mtime}
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # --- Logging / observability ---
    _LOG_MAX_LINES = int(os.getenv("BRIDGE_LOG_MAX_LINES", "5000"))
    _LOG_MAX_CHARS_PER_LINE = int(os.getenv("BRIDGE_LOG_MAX_CHARS_PER_LINE", "400"))
    _LOG_STREAM_DELTAS = os.getenv("BRIDGE_LOG_STREAM_DELTAS", "true").strip().lower() in ("1", "true", "yes", "on")

    _bridge_logs: deque[tuple[int, str]] = deque(maxlen=_LOG_MAX_LINES)
    _bridge_log_seq: int = 0

    def _clip(s: str, max_chars: int) -> str:
        if s is None:
            return ""
        s = str(s)
        if len(s) <= max_chars:
            return s
        return s[: max_chars - 1] + "…"

    @app.get("/logs")
    async def get_logs(limit: int = 200, since: int = 0):
        items = list(_bridge_logs)
        if since and since > 0:
            items = [it for it in items if it[0] > since]
        if limit and limit > 0:
            items = items[-limit:]
        last_seq = items[-1][0] if items else _bridge_log_seq
        return {
            "logs": [{"seq": seq, "line": line} for seq, line in items],
            "last_seq": last_seq,
        }

    @app.post("/logs/clear")
    async def clear_logs():
        _bridge_logs.clear()
        return {"ok": True}

    @app.get("/v1/models")
    async def list_models():
        models = []
        if workers["chat"]:
            models.append({
                "id": "webgpu-chat",
                "object": "model",
                "created": 1677610602,
                "owned_by": "webgpu-bridge"
            })
        if workers["embed"]:
            models.append({
                "id": "webgpu-embedding",
                "object": "model",
                "created": 1677610602,
                "owned_by": "webgpu-bridge"
            })
        return {"object": "list", "data": models}

    # --- Compatibility endpoint: audit/server-logs ---
    @app.get('/audit/server-logs')
    async def get_audit_server_logs(limit: int = 50):
        try:
            log_file = Path("logs/server.log")
            if not log_file.exists():
                log_file = Path("../logs/server.log")

            if log_file.exists():
                with log_file.open('r', encoding='utf-8', errors='ignore') as f:
                    lines = f.read().splitlines()
                tail = lines[-int(limit):] if limit and len(lines) > 0 else lines
                return {"logs": tail, "count": len(tail)}

            items = list(_bridge_logs)[-int(limit):]
            tail = [line for (_seq, line) in items]
            return {"logs": tail, "count": len(tail)}
        except Exception as e:
            return {"logs": [f"Bridge audit logs error: {str(e)}"], "count": 0}

    @app.websocket("/ws/{worker_type}")
    async def websocket_endpoint(websocket: WebSocket, worker_type: str):
        if worker_type not in workers:
            await websocket.close(code=4000)
            return

        await websocket.accept()
        workers[worker_type] = websocket
        log(f"✅ {worker_type.upper()} Worker Connected")

        try:
            while True:
                data = await websocket.receive_text()
                message = json.loads(data)

                if "usage" in message:
                    log(f"📊 Token Usage: {json.dumps(message['usage'])}")
                elif "chunk" in message and "usage" in message["chunk"]:
                     log(f"📊 Token Usage (Chunk): {json.dumps(message['chunk']['usage'])}")

                req_id = message.get("id")

                if req_id and isinstance(message, dict):
                    if _LOG_STREAM_DELTAS and "chunk" in message:
                        try:
                            ch = message.get("chunk")
                            if isinstance(ch, dict) and isinstance(ch.get("choices"), list) and ch["choices"]:
                                choice0 = ch["choices"][0] if isinstance(ch["choices"][0], dict) else {}
                                delta = choice0.get("delta") if isinstance(choice0, dict) else None
                                if isinstance(delta, dict) and "content" in delta:
                                    piece = delta.get("content") or ""
                                    if piece:
                                        log(f"Δ {req_id}: {_clip(piece, _LOG_MAX_CHARS_PER_LINE)}")
                        except Exception:
                            pass

                    if "token_events" in message and isinstance(message.get("token_events"), list):
                        try:
                            events = message.get("token_events")
                            for ev in events:
                                tidx = ev.get("idx")
                                ttext = _clip(ev.get("text", ""), _LOG_MAX_CHARS_PER_LINE)
                                tdt = float(ev.get("dt_ms") or ev.get("dt") or 0.0)
                                tlogp = ev.get("logprob")
                                log(f"TOK {req_id} IDX={tidx} DTms={tdt:.2f} TOK=" + ttext + (" LOGP=" + str(tlogp) if tlogp is not None else ""))
                        except Exception:
                            pass
                if req_id in active_requests:
                    await active_requests[req_id].put(message)

        except Exception as e:
            log(f"❌ {worker_type.upper()} Worker Disconnected: {e}")
        finally:
            workers[worker_type] = None

    async def stream_generator(req_id: str):
        queue = active_requests[req_id]
        try:
            while True:
                message = await queue.get()

                if message.get("error"):
                    yield f"data: {json.dumps({'error': message['error']})}\n\n"
                    break

                if message.get("done"):
                    yield "data: [DONE]\n\n"
                    break

                if "chunk" in message:
                    yield f"data: {json.dumps(message['chunk'])}\n\n"

        finally:
            if req_id in active_requests:
                del active_requests[req_id]

    async def collect_full_response(req_id: str):
        queue = active_requests[req_id]

        accumulated_content = ""
        first_chunk = None
        finish_reason = None

        try:
            while True:
                message = await queue.get()

                if message.get("error"):
                    raise HTTPException(status_code=500, detail=message['error'])

                if message.get("done"):
                    break

                if "chunk" in message:
                    chunk = message["chunk"]

                    if "choices" in chunk and "message" in chunk["choices"][0]:
                        return chunk

                    if not first_chunk:
                        first_chunk = chunk

                    if "choices" in chunk and len(chunk["choices"]) > 0:
                        delta = chunk["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            accumulated_content += content

                        if chunk["choices"][0].get("finish_reason"):
                            finish_reason = chunk["choices"][0]["finish_reason"]

        finally:
            if req_id in active_requests:
                del active_requests[req_id]

        if not first_chunk:
            raise HTTPException(status_code=500, detail="No response received from WebGPU worker")

        final_response = first_chunk.copy()
        final_response["object"] = "chat.completion"
        final_response["choices"] = [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": accumulated_content
            },
            "finish_reason": finish_reason or "stop"
        }]

        return final_response

    @app.post("/v1/chat/completions")
    @app.post("/chat/completions")
    async def chat_completions(request: Request):
        if not workers["chat"]:
            raise HTTPException(status_code=503, detail="WebGPU Chat Worker not connected. Open tools/webgpu-server-chat.html")

        body = await request.json()
        req_id = str(uuid.uuid4())
        active_requests[req_id] = asyncio.Queue()

        stream = body.get("stream", False)
        log(f"Chat Request: {req_id} - Model: {body.get('model')} - Stream: {stream}")

        await workers["chat"].send_json({
            "id": req_id,
            "type": "chat",
            "data": body
        })

        if stream:
            return StreamingResponse(stream_generator(req_id), media_type="text/event-stream")
        else:
            response_data = await collect_full_response(req_id)
            return JSONResponse(content=response_data)

    @app.post("/v1/embeddings")
    async def embeddings(request: Request):
        if not workers["embed"]:
            raise HTTPException(status_code=503, detail="WebGPU Embed Worker not connected. Open tools/webgpu-server-embed.html")

        body = await request.json()
        req_id = str(uuid.uuid4())
        active_requests[req_id] = asyncio.Queue()

        log(f"Embed Request: {req_id} - Input length: {len(str(body.get('input')))}")

        await workers["embed"].send_json({
            "id": req_id,
            "type": "embedding",
            "data": body
        })

        response_msg = await active_requests[req_id].get()
        del active_requests[req_id]

        if response_msg.get("error"):
            raise HTTPException(status_code=500, detail=response_msg["error"])

        return JSONResponse(content=response_msg["result"])

    # --- Authentication & Config ---
    import secrets
    AUTH_TOKEN = os.getenv("BRIDGE_TOKEN")
    if not AUTH_TOKEN:
        AUTH_TOKEN = secrets.token_urlsafe(16)

    @app.middleware("http")
    async def verify_token(request: Request, call_next):
        # DEBUG LOGGING - ACTIVE
        print(f"🔍 Middleware Check: {request.method} {request.url.path}") 
        
        # Check both with and without leading slash just to be safe
        path = request.url.path
        if request.method == "OPTIONS" or path.startswith("/models") or path.startswith("/v1/models") or path.startswith("models/") or path in ["/mobile", "/favicon.ico", "/logs", "/health", "/audit/server-logs", "/file-mod-time"]:
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer ") or auth_header.split(" ")[1] != AUTH_TOKEN:
            print(f"❌ Blocked Request: {request.method} {request.url.path}")
            return JSONResponse(status_code=401, content={"error": f"Unauthorized. Invalid Token. Path seen: {request.url.path}"})

        return await call_next(request)

    # ADD CORS LAST (So it is the OUTERMOST middleware and handles all responses including 401s)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health_check():
        return {"status": "ok", "service": "webgpu-bridge"}

    from fastapi.responses import HTMLResponse

    @app.get("/mobile")
    async def serve_mobile_app():
        file_path = "mobile-chat.html"
        if not os.path.exists(file_path):
            file_path = "tools/mobile-chat.html"

        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                return HTMLResponse(content=f.read())
        else:
            return HTMLResponse(content="<h1>Mobile App Not Found</h1><p>Ensure mobile-chat.html exists.</p>", status_code=404)

    @app.post("/memories/search")
    async def search_memories(request: Request):
        if not workers["chat"]:
            raise HTTPException(status_code=503, detail="WebGPU Chat Worker not connected. Open tools/model-server-chat.html")

        try:
            body = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON")

        query = body.get("query", "").trim()
        if not query:
            return JSONResponse(content=[])

        req_id = str(uuid.uuid4())
        active_requests[req_id] = asyncio.Queue()

        log(f"🔎 Bridge Memory Search: {req_id} - '{_clip(query, 50)}'")

        try:
            await workers["chat"].send_json({
                "id": req_id,
                "type": "memory_query",
                "data": {"query": query}
            })

            response_msg = await asyncio.wait_for(active_requests[req_id].get(), timeout=3.0)

            if response_msg.get("error"):
                log(f"❌ Search Error {req_id}: {response_msg['error']}")
                raise HTTPException(status_code=500, detail=response_msg["error"])

            results = response_msg.get("result", [])
            log(f"✅ Served {len(results)} memories to Extension")
            return JSONResponse(content=results)

        except asyncio.TimeoutError:
            log(f"⏰ Search Timeout {req_id} - Browser didn't respond in 3s")
            del active_requests[req_id]
            raise HTTPException(status_code=504, detail="Query timed out")
        except Exception as e:
            if req_id in active_requests:
                del active_requests[req_id]
            raise HTTPException(status_code=500, detail=str(e))

    return app

def main():
    """Main function to start the bridge with hot reload"""
    print("🔄 Starting WebGPU Bridge with Hot Reload...")
    
    # Start the file watcher thread
    watcher = FileWatcherThread()
    watcher.start()
    
    # Create and run the app
    app = create_app()
    
    host = os.getenv("BRIDGE_HOST", "0.0.0.0")
    default_port = os.getenv("BRIDGE_PORT")
    if default_port:
        port = int(default_port)
    else:
        import random
        port = random.randint(9000, 9999)

    print(f"\n🚀 WebGPU Bridge with Hot Reload Starting")
    print(f"   Host: {host}")
    print(f"   Port: {port}")
    print(f"   🔑 Token: {os.getenv('BRIDGE_TOKEN', 'sovereign-secret')}")
    print(f"   🔄 Hot Reload: ENABLED")
    print("="*60 + "\n")

    try:
        uvicorn.run(app, host=host, port=port, log_level="info")
    except KeyboardInterrupt:
        print("\n🛑 Shutting down bridge...")
        watcher.running = False
        watcher.join()

if __name__ == "__main__":
    main()