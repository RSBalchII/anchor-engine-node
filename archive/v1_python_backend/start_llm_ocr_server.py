# start_llm_ocr_server.py
# Coda Vision Sidecar (Port 8082)
# Powered by NexaAI/DeepSeek-OCR-GGUF (Q4_0)

import uvicorn
import os
import base64
import tempfile
import subprocess
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import asyncio

# Configuration
MODEL_ID = "NexaAI/DeepSeek-OCR-GGUF"
PORT = 8082
HOST = "0.0.0.0"

app = FastAPI(title="Coda Vision Sidecar", description="DeepSeek-OCR Service")

print(f"🚀 Initializing Coda Vision Sidecar on Port {PORT}...")
print(f"📂 Model: {MODEL_ID} (Ensure Q4_0 is pulled via 'nexa pull')")

# Check if nexa is available
def check_nexa_available():
    try:
        result = subprocess.run(['nexa', '--version'], capture_output=True, text=True)
        return True
    except FileNotFoundError:
        return False

NEXA_AVAILABLE = check_nexa_available()
if not NEXA_AVAILABLE:
    print("⚠️  Nexa CLI not found. Please install with: pip install nexaai")
    print("💡 Then pull the model: nexa pull NexaAI/DeepSeek-OCR-GGUF")

class OCRRequest(BaseModel):
    image_base64: str

@app.post("/ocr")
async def ocr_endpoint(file: UploadFile = File(None), payload: OCRRequest = None):
    """
    Accepts either a file upload or a base64 string.
    Uses Nexa CLI to run DeepSeek-OCR on the image.
    Returns the extracted text.
    """
    if not NEXA_AVAILABLE:
        raise HTTPException(500, "Nexa CLI not available. Please install nexaai package.")
    
    temp_path = None
    try:
        # Handle Input
        if file:
            content = await file.read()
            file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
        elif payload and hasattr(payload, 'image_base64') and payload.image_base64:
            content = base64.b64decode(payload.image_base64)
            file_ext = 'png'  # Default for base64 images
        else:
            raise HTTPException(400, "No image provided.")

        # Save to temp file for Nexa CLI
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as tmp:
            tmp.write(content)
            temp_path = tmp.name

        # Run Nexa CLI for OCR
        print(f"👁️ Processing image with Nexa CLI...")
        cmd = ['nexa', 'run', MODEL_ID, '--image', temp_path, '--stream', 'false']
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60  # 60 second timeout
            )
            
            if result.returncode != 0:
                print(f"❌ Nexa CLI error: {result.stderr}")
                raise HTTPException(500, f"OCR processing failed: {result.stderr}")
            
            output = result.stdout.strip()
            
        except subprocess.TimeoutExpired:
            raise HTTPException(500, "OCR processing timed out")
        finally:
            # Cleanup
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
        
        # Try to parse the output - OCR models typically return text
        # The output format depends on the specific model, but it's often JSON or plain text
        try:
            # Try parsing as JSON first (if Nexa returns structured output)
            parsed_output = json.loads(output)
            if isinstance(parsed_output, dict) and 'text' in parsed_output:
                text_result = parsed_output['text']
            elif isinstance(parsed_output, dict) and 'response' in parsed_output:
                text_result = parsed_output['response']
            else:
                text_result = str(parsed_output)
        except json.JSONDecodeError:
            # If not JSON, treat as plain text
            text_result = output

        return {
            "text": text_result,
            "raw_output": output
        }

    except Exception as e:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        print(f"❌ OCR Error: {e}")
        raise HTTPException(500, str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy" if NEXA_AVAILABLE else "nexa not available",
        "model": MODEL_ID,
        "port": PORT,
        "nexa_available": NEXA_AVAILABLE
    }

if __name__ == "__main__":
    print(f"✅ Starting Coda Vision Sidecar on {HOST}:{PORT}")
    print(f"📖 To use this service:")
    print(f"   1. Install: pip install nexaai")
    print(f"   2. Pull model: nexa pull NexaAI/DeepSeek-OCR-GGUF (select Q4_0)")
    print(f"   3. Send POST requests to http://localhost:{PORT}/ocr")
    uvicorn.run(app, host=HOST, port=PORT)