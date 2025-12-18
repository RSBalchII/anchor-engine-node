#!/usr/bin/env python3
"""
Embedding Server Launcher

Starts the llama-server with embedding-specific configuration
using the gemma-300m model automatically.
"""
import os
import sys
import subprocess
from pathlib import Path
import argparse
import requests

def download_gemma_model(model_url, download_path):
    """Download model file with progress indication."""
    print(f"[DOWNLOAD] Starting download: {model_url}")
    print(f"[DOWNLOAD] Destination: {download_path}")

    try:
        response = requests.get(model_url, stream=True)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0

        with open(download_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"\r[DOWNLOAD] Progress: {percent:.1f}% ({downloaded/1024/1024:.1f}MB/{total_size/1024/1024:.1f}MB)", end='', flush=True)

        print(f"\n[DOWNLOAD] Complete! Model saved to: {download_path}")
        return True
    except Exception as e:
        print(f"\n[DOWNLOAD] Error: {e}")
        if download_path.exists():
            download_path.unlink()  # Remove incomplete file
        return False

def find_gemma_model():
    """Find the gemma-300m embedding model, downloading if necessary."""
    # First look in current directory, then in the script's directory
    script_dir = Path(__file__).parent
    possible_dirs = [
        Path("models"),  # Current directory
        script_dir / "models",  # Script's parent directory
        Path("../models"),  # Parent directory (where your actual models are)
        Path("C:/Users/rsbiiw/Projects/models"),  # Actual location based on your symlink info
    ]

    # Look for embedding models, starting with gemma-specific ones
    embedding_files = []
    models_dir = None

    # Try each possible directory
    for models_dir in possible_dirs:
        if models_dir.exists():
            print(f"[INFO] Searching in: {models_dir}")
            # Look for embedding models
            for pattern in ["*embed*.gguf", "*gemma*.gguf", "*nomic*.gguf", "*bge*.gguf"]:
                found_files = list(models_dir.rglob(pattern))
                if found_files:
                    for f in found_files:
                        try:
                            # Check if file is accessible (not broken symlink)
                            if f.exists() and f.is_file() and f.stat().st_size > 0:
                                embedding_files.append(f)
                        except (OSError, PermissionError):
                            continue  # Skip broken symlinks or inaccessible files
        if embedding_files:
            break

    # Filter for gemma embedding models specifically
    gemma_files = []
    for f in embedding_files:
        f_lower = f.name.lower()
        if 'gemma' in f_lower and ('embed' in f_lower or 'embedding' in f_lower):
            gemma_files.append(f)

    # If no gemma embedding models found, look for any gemma model that might work for embeddings
    if not gemma_files:
        for f in embedding_files:
            if 'gemma' in f.name.lower() and 'embed' not in f.name.lower():
                gemma_files.append(f)

    if gemma_files:
        matched_model = gemma_files[0]
        print(f"[FOUND] Gemma embedding model found: {matched_model}")
        print(f"   - Full path: {matched_model.resolve()}")
        try:
            file_size = matched_model.stat().st_size
            print(f"   - Size: {file_size / (1024*1024):.1f} MB")
            return matched_model
        except OSError:
            print(f"[WARN] Cannot access file: {matched_model}")

    # If not found in any directory, create local models dir for download
    local_models_dir = Path("models")
    if not local_models_dir.exists():
        local_models_dir.mkdir(exist_ok=True)

    # Model not found, need to download
    print("[INFO] No gemma embedding model found, starting download...")

    # Look for the specific Google EmbeddingGemma-300M model first (the one specifically requested)
    model_urls = [
        # Google's EmbeddingGemma-300M model (the exact one requested)
        ("https://huggingface.co/google/embeddinggemma-300m-GGUF/resolve/main/embeddinggemma-300m-f32.gguf", "embeddinggemma-300m-f32.gguf"),
        ("https://huggingface.co/google/embeddinggemma-300m-GGUF/resolve/main/embeddinggemma-300m-q8.gguf", "embeddinggemma-300m-q8.gguf"),
        ("https://huggingface.co/google/embeddinggemma-300m-GGUF/resolve/main/embeddinggemma-300m-q4k.gguf", "embeddinggemma-300m-q4k.gguf"),
        # Fallback: BGE models if the specific one isn't available
        ("https://huggingface.co/BAAI/bge-large-en-v1.5-GGUF/resolve/main/bge-large-en-v1.5.Q4_K_M.gguf", "bge-large-en-v1.5.Q4_K_M.gguf"),
        ("https://huggingface.co/BAAI/bge-base-en-v1.5-GGUF/resolve/main/bge-base-en-v1.5.Q4_K_M.gguf", "bge-base-en-v1.5.Q4_K_M.gguf"),
        # Fallback: Nomic embed text
        ("https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q4_K_M.gguf", "nomic-embed-text-v1.5.Q4_K_M.gguf"),
    ]

    # Try downloading each model until one succeeds
    for model_url, filename in model_urls:
        model_path = local_models_dir / filename  # Download to local models directory
        print(f"[INFO] Trying to download: {filename}")
        print(f"[INFO] URL: {model_url}")
        if download_gemma_model(model_url, model_path):
            print(f"[SUCCESS] Model download completed: {model_path}")
            return model_path
        else:
            print(f"[ERROR] Failed to download: {filename}")
            if model_path.exists():
                model_path.unlink()  # Remove failed download
            continue  # Try next model

    # If all downloads failed
    print("[ERROR] Could not download any suitable embedding model")
    print("[HELP] Expected files like: gemma-300m.gguf, nomic-embed-text*.gguf, bge-*.gguf, etc.")
    print(f"[INFO] Available models in local models/: {[f.name for f in local_models_dir.rglob('*.gguf')]}")
    return None

def find_llama_server():
    """Find llama-server executable for embeddings."""
    # Common locations and names for llama-server - prioritizing the user's specific location
    possible_paths = [
        # Windows - Your specific path based on the listing
        "C:/Users/rsbiiw/llama.cpp/build/bin/Release/llama-server.exe",
        # Updated path with Windows style
        "C:\\Users\\rsbiiw\\llama.cpp\\build\\bin\\Release\\llama-server.exe",
        # Windows - other common locations
        ".\\llama-server.exe",
        "llama-server.exe",
        # Fallback to regular server
        "./llama-server",
        "llama-server",
    ]

    for path in possible_paths:
        if Path(path).exists():
            return Path(path).resolve()

    print("[ERROR] Could not find llama-server executable")
    print("\n[HELP] To install llama.cpp server:")
    print("   1. Clone: git clone https://github.com/ggerganov/llama.cpp")
    print("   2. Build: cd llama.cpp && make server")
    print("   3. Or on Windows: cd llama.cpp && mkdir build && cd build && cmake .. && cmake --build . --config Release")
    print("\n[NOTE] Note: Embedding server is optional. ECE Core and LLM server work without it.")
    return None

def start_embedding_server(model_path, port=8081):
    """Start llama-server in embedding mode."""
    llama_server = find_llama_server()
    if not llama_server:
        return False
    
    print(f"\n[EMBED] Starting Embedding Server with gemma model...")
    print(f"   Model: {model_path}")
    print(f"   Port: {port}")
    print(f"   Server: {llama_server}")
    
    # Embedding-optimized settings
    cmd = [
        str(llama_server),
        "-m", str(model_path),
        "--port", str(port),
        "--ctx-size", "2048",    # Smaller context for embeddings
        "--n-gpu-layers", "99",  # Full GPU offload for RTX 4090
        "--threads", "8",        # Fewer threads since embeddings are less intensive
        "--batch-size", "1024",  # Increased batch size to handle larger inputs
        "--ubatch-size", "512",  # Increased micro-batch for embeddings
        "--parallel", "1",       # Single parallel slot
        "--embedding",           # Enable embedding mode specifically
        "--pooling", "mean",     # Mean pooling for embeddings
        "--rope-freq-base", "10000.0",  # Standard RoPE frequency
    ]
    
    print(f"\n[CMD] Command: {' '.join(cmd)}")
    print("\n[WAIT] Starting embedding server... (this may take a moment)")

    try:
        # Start the server process
        process = subprocess.Popen(cmd)

        # Wait for user to stop the server
        print(f"\n[SUCCESS] Embedding server started successfully!")
        print(f"   - API available at: http://localhost:{port}")
        print(f"   - Test embeddings: curl -X POST http://localhost:{port}/v1/embeddings -H 'Content-Type: application/json' -d '{{\"model\":\"{model_path.name}\",\"input\":[\"test text\"]}}'")
        print("\n[INFO] Press Ctrl+C to stop the server")
        
        # Wait for process to complete (or be interrupted)
        process.wait()
        
    except KeyboardInterrupt:
        print(f"\n[STOP] Shutting down embedding server...")
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        print("[DONE] Embedding server stopped")
    
    return True

def main():
    parser = argparse.ArgumentParser(description="Embedding Server Launcher (Gemma-300m Auto-Config)")
    parser.add_argument("--port", type=int, default=8081, help="Port for embedding server (default: 8081)")
    parser.add_argument("--model", type=str, help="Path to embedding model (defaults to gemma-300m auto-detect)")

    args = parser.parse_args()

    if args.model:
        model_path = Path(args.model)
        if not model_path.exists():
            print(f"[ERROR] Model file not found: {model_path}")
            return
    else:
        model_path = find_gemma_model()
        if not model_path:
            print("[ERROR] Could not find gemma embedding model, exiting")
            return

    success = start_embedding_server(model_path, args.port)
    if not success:
        print("[ERROR] Failed to start embedding server")
        sys.exit(1)

if __name__ == "__main__":
    main()