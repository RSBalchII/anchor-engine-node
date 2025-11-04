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
    model_path = "./models/Huihui-granite-4.0-h-tiny-abliterated.i1-Q4_K_M.gguf"
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
            print("  --model PATH    Path to model file (default: ./models/Huihui-granite-4.0-h-tiny-abliterated.i1-Q4_K_M.gguf)")
            print("  --port PORT     Port to run llama.cpp server on (default: 8080)")
            print("  -h, --help      Show this help message")
            print("")
            print("Example:")
            print(f"  python {sys.argv[0]} --model ./models/Huihui-granite-4.0-h-tiny-abliterated.i1-Q4_K_M.gguf --port 8080")
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
    
    # Ensure logs directory exists
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Run the main script with the arguments, capturing output
    cmd = [sys.executable, str(main_script), "--model", model_path, "--port", str(port)]
    
    # Open log file for appending output
    log_file_path = logs_dir / "ece-llamacpp.txt"
    
    # Create subprocess with both stdout and stderr redirected to log file and PIPE for capturing
    with open(log_file_path, 'w', encoding='utf-8') as log_file:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,  # Redirect stderr to stdout
            text=True,
            universal_newlines=True,
            bufsize=1
        )
        
        # Stream output to both console and log file using a thread to handle reading
        import threading
        
        def stream_output(pipe, log_file, console_output=True):
            for line in iter(pipe.readline, ''):
                if console_output:
                    try:
                        print(line.rstrip())  # Print to console
                    except UnicodeEncodeError:
                        # Handle special Unicode characters that can't be printed to console
                        print(line.encode('utf-8', errors='replace').decode('utf-8'))
                # Write to log file with proper encoding
                try:
                    log_file.write(line)      # Write to log file
                except UnicodeEncodeError:
                    # Handle special characters in log file
                    log_file.write(line.encode('utf-8', errors='replace').decode('utf-8'))
                log_file.flush()          # Ensure it's written immediately
            pipe.close()
        
        # Start thread to handle output streaming
        output_thread = threading.Thread(target=stream_output, args=(process.stdout, log_file, True))
        output_thread.daemon = True
        output_thread.start()
        
        # Wait for process to complete
        process.wait()
        output_thread.join()  # Wait for output thread to finish
        
        # Get the return code
        return_code = process.returncode
    
    if return_code != 0:
        print("[ERROR] Failed to start simplified ECE system.")
        # Also print the last few lines of the log for debugging
        try:
            with open(log_file_path, 'r', encoding='utf-8') as log_file:
                lines = log_file.readlines()
                print("Last 10 lines of log for debugging:")
                for line in lines[-10:]:
                    print(line.rstrip())
        except Exception as e:
            print(f"Could not read log file for debugging: {e}")
        sys.exit(return_code)
    
    print(f"Simplified ECE system started successfully, logs saved to {log_file_path}")

if __name__ == "__main__":
    main()