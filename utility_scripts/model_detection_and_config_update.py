#!/usr/bin/env python3
"""
Model Detection and Configuration Update Script for External Context Engine (ECE)
This script detects which model server is currently running and updates the ECE configuration accordingly.
"""

import requests
import json
import os
import socket
import sys
from pathlib import Path

# Import the centralized ConfigManager
from ece.common.config_manager import ConfigManager
from ece.common.project_root import get_project_root


def is_port_open(host, port):
    """Check if a port is open on the given host"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(1)  # 1 second timeout
            result = sock.connect_ex((host, port))
            return result == 0
    except:
        return False

def get_model_info_from_port(port):
    """Get model information from a running server on the specified port"""
    try:
        # Try to get model info from the server
        response = requests.get(f"http://localhost:{port}/v1/models", timeout=5)
        if response.status_code == 200:
            models_data = response.json()
            if 'data' in models_data and len(models_data['data']) > 0:
                model_name = models_data['data'][0].get('id', f'unknown_model_on_port_{port}')
                return model_name
    except requests.exceptions.RequestException:
        pass
    except json.JSONDecodeError:
        pass
    return None

def detect_running_model():
    """Detect which model server is currently running by checking ports 8080-8094"""
    print("Detecting running model servers...")
    
    # Port to model mapping
    port_model_mapping = {
        8080: "jamba-reasoning-3b-Q4_K_M",
        8081: "deepseek-r1-distill-qwen-14b-q4_k_m",
        8082: "gemma-3-12b-it-q4_0",
        8083: "ibm-granite_granite-4.0-h-tiny-Q6_K",
        8084: "jamba-reasoning-3b-F16",
        8085: "ibm-granite_granite-4.0-h-tiny-Q8_0",
        8086: "Qwen3-30B-A3B-Q4_K_M",
        8087: "Qwen3-14B-Q5_K_M",
        8088: "DeepSeek-Coder-V2-Lite-Instruct-Q5_K_M",
        8089: "Qwen2.5-Coder-14B-Instruct-Q5_K_M(1)"
    }
    
    # Check each port for a running model server
    for port in range(8080, 8095):  # Extended to check up to port 8094
        if is_port_open("localhost", port):
            print(f"Found server running on port {port}")
            model_name = get_model_info_from_port(port)
            if model_name:
                print(f"Detected model: {model_name}")
                return port, model_name
            elif port in port_model_mapping:
                print(f"Using default model mapping for port {port}: {port_model_mapping[port]}")
                return port, port_model_mapping[port]
    
    print("No running model server detected")
    return None, None

def update_config_yaml(port, model_name):
    """Update the config.yaml file with the detected model information using ConfigManager"""
    try:
        # Initialize ConfigManager to handle the configuration
        config_manager = ConfigManager()
        
        # Cleanse model name to ensure proper format
        if model_name and not model_name.endswith('.gguf'):
            model_name_clean = model_name.replace('.gguf', '')  # Remove duplicate extension if present
        else:
            model_name_clean = model_name
        
        # Prepare the model path
        model_path = f"./models/{model_name_clean}.gguf"
        api_base = f"http://localhost:{port}/v1"
        
        # Use ConfigManager to update model configuration
        config_manager.update_model_config(port, model_name_clean, model_path, api_base)
        
        # Update ThinkerAgent configuration if it exists in the loaded config
        config = config_manager.get_config()
        if 'ThinkerAgent' in config:
            config_manager.set('ThinkerAgent.model', model_path)
            config_manager.set('ThinkerAgent.synthesis_model', model_path)
        
        # Validate the configuration before saving
        if config_manager.validate():
            # Save the updated configuration
            if config_manager.save():
                print(f"Updated config.yaml with model {model_name_clean} on port {port}")
                return True
            else:
                print("Failed to save the updated configuration")
                return False
        else:
            print("Configuration validation failed after updates")
            return False
        
    except Exception as e:
        print(f"Error updating config.yaml: {e}")
        return False

def main():
    """Main function to detect running model and update configuration"""
    print("External Context Engine (ECE) Model Detection and Configuration Update")
    print("=" * 70)
    
    # Detect running model
    port, model_name = detect_running_model()
    
    if port and model_name:
        # Update configuration
        if update_config_yaml(port, model_name):
            print(f"\n✓ Successfully updated ECE configuration for model: {model_name}")
            print(f"✓ Model server detected on port: {port}")
            print(f"✓ Configuration updated in config.yaml")
        else:
            print(f"\n✗ Failed to update ECE configuration for model: {model_name}")
            return 1
    else:
        print("\n⚠ No running model server detected")
        print("Models are now handled via on-demand ModelManager which starts models when needed.")
        print("Use the start_ecosystem scripts to start the ECE system.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())