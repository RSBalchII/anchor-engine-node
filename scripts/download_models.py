
import os
import json
import requests
import sys
from pathlib import Path

# Configuration
MODELS_DIR = Path("models").resolve()
HF_ENDPOINT = "https://huggingface.co"

def download_file(url, dest_path, progress_callback=None):
    """Download a file with progress indication"""
    if dest_path.exists():
        if progress_callback: progress_callback(f"Skipping {dest_path.name} (exists)", 1.0)
        return

    if progress_callback: progress_callback(f"Downloading {dest_path.name}...", 0.0)
    
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        block_size = 8192
        wrote = 0
        
        with open(dest_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=block_size):
                f.write(chunk)
                wrote += len(chunk)
                # Optional: detailed progress
        
        if progress_callback: progress_callback(f"✓ Saved {dest_path.name}", 1.0)
        
    except Exception as e:
        if progress_callback: progress_callback(f"❌ Error {dest_path.name}: {e}", 0.0)
        raise e

def download_model(model_id, repo_url=None, base_dir=None, progress_callback=None):
    """
    Downloads an MLC model from Hugging Face.
    
    Args:
        model_id (str): The ID of the model (e.g. "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC")
        repo_url (str, optional): Full HF URL. Defaults to constructing from model_id.
        base_dir (Path, optional): Directory to store models. Defaults to ./models
        progress_callback (func, optional): Function(msg, progress_float)
    """
    if base_dir is None:
        base_dir = MODELS_DIR
    
    base_dir.mkdir(exist_ok=True)
    
    # Handle model_id / repo_url
    if not repo_url:
        repo_url = f"{HF_ENDPOINT}/mlc-ai/{model_id}"
    
    # Strip prefix from model_id for directory name
    dir_name = model_id.split("/")[-1]
    model_dir = base_dir / dir_name
    model_dir.mkdir(exist_ok=True)
    
    if progress_callback: progress_callback(f"🚀 Starting download for {dir_name}", 0.0)

    # 1. Download ndarray-cache.json
    cache_url = f"{repo_url}/resolve/main/ndarray-cache.json"
    cache_path = model_dir / "ndarray-cache.json"
    
    try:
        download_file(cache_url, cache_path, progress_callback)
    except Exception as e:
        print(f"❌ Failed to fetch ndarray-cache.json: {e}")
        raise e

    # 2. Parse cache
    with open(cache_path, 'r') as f:
        cache_data = json.load(f)
        
    records = cache_data.get("records", [])
    total_files = len(records) + 5
    completed = 1

    # 3. Download Shards
    for record in records:
        # Check both keys for safety (older MLC mappings used 'name')
        file_name = record.get("dataPath", record.get("name"))
        if not file_name:
            continue
            
        url = f"{repo_url}/resolve/main/{file_name}"
        dest = model_dir / file_name
        
        download_file(url, dest)
        
        completed += 1
        if progress_callback: 
            progress_callback(f"Downloading {file_name}", completed/total_files)

    # 4. Download Configs
    config_files = ["mlc-chat-config.json", "tokenizer.json", "tokenizer_config.json", "vocab.json", "merges.txt"]
    for fname in config_files:
        url = f"{repo_url}/resolve/main/{fname}"
        dest = model_dir / fname
        try:
            download_file(url, dest)
        except:
            pass # Optional
        
        completed += 1
        if progress_callback: 
            progress_callback(f"Checked {fname}", completed/total_files)

    if progress_callback: progress_callback("✅ Download Complete", 1.0)
    print(f"Serve at: http://localhost:8080/models/{dir_name}")

def main():
    # Default behavior: Download Qwen2.5-Coder-1.5B
    default_model = "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC"
    
    def print_progress(msg, p):
        print(f"[{int(p*100)}%] {msg}")

    download_model(default_model, progress_callback=print_progress)

if __name__ == "__main__":
    main()
