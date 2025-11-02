#!/usr/bin/env python3
"""
Wrapper script to run the simplified ECE ecosystem.
This can be called by uv run as a Python script instead of trying to run the PowerShell script directly.
"""

import subprocess
import sys
import os
from pathlib import Path

def main():
    # Parse command line arguments
    model_path = "./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf"
    port = 8080
    
    i = 1
    while i < len(sys.argv):
        if sys.argv[i] == "--model" and i + 1 < len(sys.argv):
            model_path = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--port" and i + 1 < len(sys.argv):
            try:
                port = int(sys.argv[i + 1])
                i += 2
            except ValueError:
                print(f"Error: Invalid port value '{sys.argv[i + 1]}'")
                sys.exit(1)
        elif sys.argv[i] in ["-h", "--help"]:
            print("Simplified ECE Startup Script (Python Wrapper)")
            print("==============================================")
            print("")
            print("Usage:")
            print(f"  {sys.argv[0]} [--model PATH] [--port PORT]")
            print("")
            print("Parameters:")
            print("  --model PATH    Path to model file (default: ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf)")
            print("  --port PORT     Port to run llama.cpp server on (default: 8080)")
            print("  -h, --help      Show this help message")
            print("")
            print("Example:")
            print(f"  python {sys.argv[0]} --model ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf --port 8080")
            print("")
            sys.exit(0)
        else:
            print(f"Unknown argument: {sys.argv[i]}")
            print("Use --help for usage information.")
            sys.exit(1)
        i += 1
    
    # Check if the main script exists
    main_script = Path("start_simplified_ecosystem.py")
    if not main_script.exists():
        print("[ERROR] start_simplified_ecosystem.py not found in current directory.")
        print("Please run this script from the project root directory.")
        sys.exit(1)
    
    print("Simplified ECE Startup Script (Python Wrapper)")
    print("==============================================")
    print("")
    print("Starting Simplified ECE System...")
    print(f"Model: {model_path}")
    print(f"Port: {port}")
    print("")
    
    # Run the main script with the arguments
    cmd = [sys.executable, str(main_script), "--model", model_path, "--port", str(port)]
    result = subprocess.run(cmd)
    
    if result.returncode != 0:
        print("[ERROR] Failed to start simplified ECE system.")
        sys.exit(result.returncode)
    
    print("Simplified ECE system started successfully.")

if __name__ == "__main__":
    main()