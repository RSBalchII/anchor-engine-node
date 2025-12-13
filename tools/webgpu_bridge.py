import asyncio
import uvicorn
import json
import uuid
from fastapi import FastAPI, WebSocket, Request, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any

app = FastAPI(title="WebGPU Bridge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active WebSocket connections
# We use a simple single-worker model for now (one browser tab per role)
workers: Dict[str, WebSocket] = {
    "chat": None,
    "embed": None
}

# Store pending response futures
# Map: request_id -> asyncio.Queue
active_requests: Dict[str, asyncio.Queue] = {}

# Store logs
bridge_logs = []

def log(msg: str):
    import datetime
    timestamp = datetime.datetime.now().isoformat()
    entry = f"{timestamp} - {msg}"
    print(entry)
    bridge_logs.append(entry)
    if len(bridge_logs) > 1000:
        bridge_logs.pop(0)

@app.get("/logs")
async def get_logs(limit: int = 100):
    return {"logs": bridge_logs[-limit:]}

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
            
            req_id = message.get("id")
            if req_id in active_requests:
                # Put the chunk/result into the queue for the HTTP handler to consume
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
            
            # Forward the chunk exactly as received (OpenAI format)
            if "chunk" in message:
                yield f"data: {json.dumps(message['chunk'])}\n\n"
            
    finally:
        del active_requests[req_id]

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    if not workers["chat"]:
        raise HTTPException(status_code=503, detail="WebGPU Chat Worker not connected. Open tools/webgpu-server-chat.html")
    
    body = await request.json()
    req_id = str(uuid.uuid4())
    active_requests[req_id] = asyncio.Queue()
    
    log(f"Chat Request: {req_id} - Model: {body.get('model')}")

    # Forward request to browser
    await workers["chat"].send_json({
        "id": req_id,
        "type": "chat",
        "data": body
    })
    
    # Return streaming response
    return StreamingResponse(stream_generator(req_id), media_type="text/event-stream")

@app.post("/v1/embeddings")
async def embeddings(request: Request):
    if not workers["embed"]:
        raise HTTPException(status_code=503, detail="WebGPU Embed Worker not connected. Open tools/webgpu-server-embed.html")
    
    body = await request.json()
    req_id = str(uuid.uuid4())
    active_requests[req_id] = asyncio.Queue()
    
    log(f"Embed Request: {req_id} - Input length: {len(str(body.get('input')))}")

    # Forward request to browser
    await workers["embed"].send_json({
        "id": req_id,
        "type": "embedding",
        "data": body
    })
    
    # Wait for the single response (Embeddings are usually not streamed, but we use the queue for async wait)
    response_msg = await active_requests[req_id].get()
    del active_requests[req_id]
    
    if response_msg.get("error"):
        raise HTTPException(status_code=500, detail=response_msg["error"])
        
    return JSONResponse(content=response_msg["result"])

if __name__ == "__main__":
    print("🌉 WebGPU Bridge starting on port 8080...")
    uvicorn.run(app, host="0.0.0.0", port=8080)
