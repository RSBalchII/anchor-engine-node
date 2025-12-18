#!/usr/bin/env python3
"""
Qwen3-4B-MiniMight Server Launcher with Auto-Download

Downloads the Qwen3-4B-MiniMight-Q8 model and starts the llama-server
with optimized settings for maximum context window and Qwen3 compatibility.
"""
import os
import sys
import subprocess
import argparse
from pathlib import Path
import requests
from urllib.parse import urlparse
import time

def download_model(model_url, download_path):
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

def find_minimight_model():
    """Find the Qwen3-4B-MiniMight-Q8 model, downloading if necessary."""
    # Look for models directory in common locations - including parent directory
    script_dir = Path(__file__).parent
    possible_dirs = [
        Path("models"),  # Current directory
        script_dir / "models",  # Script's parent directory (this file is in root)
        Path("../models"),  # Parent directory (where your actual models are)
        Path("C:/Users/rsbiiw/Projects/models"),  # Actual location based on your symlink info
    ]

    models_dir = None
    model_files = []

    # Try each possible directory
    for models_dir in possible_dirs:
        if models_dir.exists():
            print(f"[INFO] Searching in: {models_dir}")
            # Look for Qwen3-4B-MiniMight-Q8 model with flexible matching
            # Using more flexible search to match potential variations
            for pattern in ["*Qwen3*4B*MiniMight*.gguf", "*qwen3*4b*minimight*.gguf", "*minimight*.gguf"]:
                found_files = list(models_dir.rglob(pattern))
                if found_files:
                    model_files.extend(found_files)

        if model_files:
            break

    if model_files:
        # Pick the first match or the best match
        matched_model = model_files[0]
        print(f"[FOUND] Qwen3-4B-MiniMight model found: {matched_model}")
        print(f"   - Full path: {matched_model.resolve()}")
        # Check if it's a broken symlink
        try:
            if not matched_model.exists() or not matched_model.is_file():
                print(f"[WARN] Found file appears to be a broken link or doesn't exist: {matched_model}")
                model_files = []  # Reset to trigger download
            else:
                file_size = matched_model.stat().st_size
                print(f"   - Size: {file_size / (1024*1024):.1f} MB")
                return matched_model
        except OSError:
            print(f"[WARN] Cannot access file: {matched_model}")
            model_files = []  # Reset to trigger download

    # If not found in any directory, create local models dir for download
    local_models_dir = Path("models")
    if not local_models_dir.exists():
        local_models_dir.mkdir(exist_ok=True)

    # Model not found, need to download
    print("[INFO] Qwen3-4B-MiniMight model not found, starting download...")

    # Try multiple URLs - in case the original repo is not accessible
    possible_downloads = [
        # Original ZeroXClem repo with various quantization options
        ("https://huggingface.co/ZeroXClem/Qwen3-4B-MiniMight-Q8_0-GGUF/resolve/main/", [
            "Qwen3-4B-MiniMight-Q8_0.gguf",
            "Qwen3-4B-MiniMight-Q5_K_M.gguf",
            "Qwen3-4B-MiniMight-Q4_K_M.gguf",
            "qwen3-4b-minimight-Q8_0.gguf",
            "qwen3-4b-minimight-Q5_K_M.gguf",
            "qwen3-4b-minimight-Q4_K_M.gguf",
            "qwen3-4b-minimight.gguf"
        ]),
        # Alternative repositories if the original doesn't work
        ("https://huggingface.co/bartowski/Qwen3-4B-MiniMight-GGUF/resolve/main/", [
            "Qwen3-4B-MiniMight-Q8_0.gguf",
            "Qwen3-4B-MiniMight-Q5_K_M.gguf",
            "Qwen3-4B-MiniMight-Q4_K_M.gguf",
        ])
    ]

    for repo_url, filenames in possible_downloads:
        for filename in filenames:
            model_url = f"{repo_url}{filename}"
            model_path = local_models_dir / filename  # Download to local models directory
            print(f"[INFO] Trying to download: {filename} from {repo_url}")
            if download_model(model_url, model_path):
                print(f"[SUCCESS] Model download completed: {model_path}")
                return model_path
            else:
                print(f"[ERROR] Failed to download: {filename}")
                # Remove failed download attempt
                if model_path.exists():
                    model_path.unlink()

    print("[ERROR] Model download failed for all attempted repositories and filenames")
    print("[HINT] You may need to manually download the model from HuggingFace or specify a model path with --model")
    return None

def find_llama_server():
    """Find llama-server executable."""
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
            print(f"[INFO] Found llama-server at: {Path(path).resolve()}")
            return Path(path).resolve()

    print(f"[ERROR] Could not find llama-server executable in any of these locations:")
    for path in possible_paths:
        print(f"  - {Path(path).resolve()}")
    print("[HELP] To install llama.cpp server:")
    print("   1. Clone: git clone https://github.com/ggerganov/llama.cpp")
    print("   2. Build: cd llama.cpp && make server")
    print("   3. Or on Windows: cd llama.cpp && mkdir build && cd build && cmake .. && cmake --build . --config Release")
    return None

def get_system_specs():
    """Get system specifications like RAM, VRAM, CPU info."""
    try:
        import psutil
    except ImportError:
        print("[WARNING] psutil not installed. Using default system specs.")
        import platform
        return {
            'total_ram_gb': 32.0,  # Default assumption
            'available_ram_gb': 24.0,  # Default assumption
            'cpu_count': 8,  # Default assumption
            'cpu_freq': 2.0,  # Default assumption
            'platform': platform.system(),
            'is_windows': platform.system() == 'Windows'
        }

    import platform

    specs = {
        'total_ram_gb': round(psutil.virtual_memory().total / (1024**3), 2),
        'available_ram_gb': round(psutil.virtual_memory().available / (1024**3), 2),
        'cpu_count': psutil.cpu_count(),
        'cpu_freq': psutil.cpu_freq().max if psutil.cpu_freq() else 2.0,  # default to 2.0 GHz
        'platform': platform.system(),
        'is_windows': platform.system() == 'Windows'
    }

    # Try to get VRAM info (this is approximate)
    specs['vram_gb'] = 16.0  # Default assumption for typical setup

    return specs

def analyze_model(model_path):
    """Analyze model characteristics based on filename and size."""
    import re
    model_name = model_path.name.lower()
    size_bytes = model_path.stat().st_size
    size_gb = round(size_bytes / (1024**3), 2)

    characteristics = {
        'size_gb': size_gb,
        'is_qwen': 'qwen' in model_name,
        'is_gemma': 'gemma' in model_name,
        'is_llama': 'llama' in model_name or 'llm' in model_name,
        'is_moe': 'moe' in model_name or '4x' in model_name or 'california' in model_name,
        'quantization': 'q8' if 'q8' in model_name else 'q4' if 'q4' in model_name else 'f16' if 'f16' in model_name else 'unknown',
        'base_model': 'qwen3' if 'qwen3' in model_name else 'gemma3' if 'gemma' in model_name else 'llama' if 'llama' in model_name else 'unknown'
    }

    return characteristics

def get_optimal_settings(model_char, system_specs):
    """Get optimal settings based on model characteristics and system specs."""
    settings = {}

    # Determine context size based on model size and available RAM
    if model_char['size_gb'] <= 2.0:
        settings['ctx_size'] = 131072  # 128k for small models
    elif model_char['size_gb'] <= 4.0:
        settings['ctx_size'] = 65536   # 64k for 4B models like Qwen3
    elif model_char['size_gb'] <= 7.0:
        settings['ctx_size'] = 32768   # 32k for 7B models
    elif model_char['size_gb'] <= 10.0:
        settings['ctx_size'] = 16384   # 16k for 10B models (like your 4x3 MoE)
    else:
        settings['ctx_size'] = 8192    # 8k for larger models

    # Adjust for available RAM
    available_ram_gb = system_specs['available_ram_gb']
    if available_ram_gb < 8:
        settings['ctx_size'] = max(2048, settings['ctx_size'] // 4)  # Conservative
    elif available_ram_gb < 16:
        settings['ctx_size'] = max(4096, settings['ctx_size'] // 2)  # Moderate
    # If 16GB+ available, keep full context size

    # Determine batch sizes based on model size
    if model_char['size_gb'] <= 4.0:
        settings['batch_size'] = 1024
        settings['ubatch_size'] = 1024
    elif model_char['size_gb'] <= 7.0:
        settings['batch_size'] = 512
        settings['ubatch_size'] = 512
    else:
        settings['batch_size'] = 256
        settings['ubatch_size'] = 256

    # Determine GPU layers based on VRAM
    vram_gb = system_specs['vram_gb']
    if vram_gb >= 16:
        settings['gpu_layers'] = 99  # All layers
    elif vram_gb >= 8:
        settings['gpu_layers'] = 35  # Most layers
    else:
        settings['gpu_layers'] = 20  # Some layers

    # Determine threads based on CPU count
    cpu_count = system_specs['cpu_count']
    settings['threads'] = min(12, max(4, cpu_count - 2))  # Use most but not all cores

    # Model-specific settings
    if model_char['is_qwen']:
        settings['pooling'] = 'cls'
        settings['rope_freq_base'] = 10000
    elif model_char['is_gemma']:
        settings['pooling'] = 'cls'
        settings['rope_freq_base'] = 10000
    elif model_char['is_llama']:
        settings['pooling'] = 'mean'
        settings['rope_freq_base'] = 1000000  # Llama-specific

    return settings

def check_flash_attention_support(llama_server_path):
    """Check if the llama-server supports the --fa (flash attention) flag."""
    # Test run with just the --fa flag to see if it's recognized - most reliable method
    try:
        # Use a quick test with just --fa flag to check if it's recognized
        result = subprocess.run([str(llama_server_path), "--fa"],
                              capture_output=True, text=True, timeout=5)
        error_text = result.stderr.lower() if result.stderr else ""
        output_text = result.stdout.lower() if result.stdout else ""

        # If it says "invalid argument", "unknown option", "unrecognized" for --fa, then it's not supported
        full_output = error_text + output_text
        if ("invalid argument" in full_output or
            "unknown" in full_output or
            "unrecognized" in full_output or
            "unrecognized option" in full_output or
            "does not exist" in full_output or
            "error" in full_output):
            return False
        else:
            # If the exit code is non-zero with just --fa, it's likely not supported
            return result.returncode == 0
    except Exception as e:
        # If test fails completely, assume flash attention is not supported
        return False

def start_llm_server(model_path, port=8080):
    """Start llama-server with Qwen3-4B-MiniMight optimized settings."""
    llama_server = find_llama_server()
    if not llama_server:
        return False

    print(f"\n[INFO] Analyzing system and model for optimal settings...")
    print(f"   Model: {model_path}")
    print(f"   Port: {port}")
    print(f"   Server: {llama_server}")

    # Get system specs and analyze model
    system_specs = get_system_specs()
    model_char = analyze_model(model_path)

    print(f"   System RAM: {system_specs['total_ram_gb']}GB | Available: {system_specs['available_ram_gb']}GB")
    print(f"   CPU Cores: {system_specs['cpu_count']}")
    print(f"   Model Size: {model_char['size_gb']}GB | Type: {model_char['base_model']}")
    print(f"   Quantization: {model_char['quantization']}")

    # Get optimal settings
    optimal_settings = get_optimal_settings(model_char, system_specs)

    print(f"   Optimized Context Size: {optimal_settings['ctx_size']}")
    print(f"   Optimized Batch Sizes: {optimal_settings['batch_size']}/{optimal_settings['ubatch_size']}")

    # Check for flash attention support
    fa_support = check_flash_attention_support(llama_server)
    print(f"   Flash Attention Support: {'Yes' if fa_support else 'No'}")

    # Qwen3-4B-MiniMight optimized settings for reasoning and long contexts (64k)
    cmd = [
        str(llama_server),
        "-m", str(model_path),
        "--port", str(port),
        "--ctx-size", "65536",      # Fixed 64k context for infinite work capability
        "--n-gpu-layers", "99",     # Full GPU offload for RTX 4090 (all layers on GPU)
        "--threads", str(optimal_settings['threads']),    # Adjusted based on CPU count
        "--batch-size", str(optimal_settings['batch_size']),  # Adjusted based on model size
        "--ubatch-size", str(optimal_settings['ubatch_size']), # Adjusted based on model size
        "--parallel", "1",          # Single parallel slot
        "--mirostat", "2",          # Advanced sampling for reasoning models
        "--temp", "1.0",            # Temperature for reasoning models
        "--top-p", "0.95",          # Nucleus sampling threshold
        "--cache-type-k", "q8_0",   # Quantized KV cache to compress context memory
        "--cache-type-v", "q8_0",   # Quantized KV cache to compress context memory
        "--embeddings",             # Enable embeddings for memory operations
        "--jinja",                  # Enable Jinja template support for tools/function calling
        "--rope-scaling", "linear", # Better handling for long contexts
        "--pooling", "cls",         # Specific pooling for Qwen models
    ]

    # Add rope frequency base if available in settings
    if 'rope_freq_base' in optimal_settings:
        cmd.extend(["--rope-freq-base", str(optimal_settings['rope_freq_base'])]) # Qwen-specific frequency base
    else:
        cmd.extend(["--rope-freq-base", "10000"]) # Default value

    # REMOVED: Forced chat template. We rely on GGUF metadata auto-detection.
    # cmd.extend(["--chat-template", "qwen"])  # This is a Qwen model, use qwen template

    # Add flash attention flag if supported
    if fa_support:
        cmd.append("--fa")          # Flash Attention for better performance with long contexts

    print(f"\n[DEBUG] Command: {' '.join(cmd)}")
    print("\n[INFO] Starting server... (this may take a moment to load the model)")

    try:
        # Start the server process
        process = subprocess.Popen(cmd)

        # Wait for user to stop the server
        print(f"\n[SUCCESS] Server started successfully!")
        print(f"   - API available at: http://localhost:{port}")
        print(f"   - Health check: curl http://localhost:{port}/v1/models")
        print(f"   - Context window: {optimal_settings['ctx_size']} tokens (optimized for system)")
        print("\n[INFO] Press Ctrl+C to stop the server")

        # Wait for process to complete (or be interrupted)
        process.wait()

    except KeyboardInterrupt:
        print(f"\n[INFO] Shutting down LLM server...")
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        print("[SUCCESS] Server stopped")

    return True

def main():
    parser = argparse.ArgumentParser(description="Qwen3-4B-MiniMight Server Launcher (Auto-Download & Optimize)")
    parser.add_argument("--port", type=int, default=8080, help="Port for llama-server (default: 8080)")
    parser.add_argument("--model", type=str, help="Path to model file (defaults to Qwen3-4B-MiniMight auto-download)")

    args = parser.parse_args()

    if args.model:
        model_path = Path(args.model)
        if not model_path.exists():
            print(f"[ERROR] Model file not found: {model_path}")
            return
    else:
        model_path = find_minimight_model()
        if not model_path:
            print("[ERROR] Could not find or download Qwen3-4B-MiniMight model, exiting")
            return

    success = start_llm_server(model_path, args.port)
    if not success:
        print("[ERROR] Failed to start LLM server")
        sys.exit(1)

if __name__ == "__main__":
    main()