#!/usr/bin/env python3
"""
Simplified script to start the ECE ecosystem: Redis, Neo4j, and all ECE agents
"""
import subprocess
import sys
import time
import yaml
import os
import argparse
import socket
from pathlib import Path

def start_docker_services():
    """Start Redis and Neo4j using docker-compose"""
    print("Starting Redis and Neo4j services...")
    
    try:
        result = subprocess.run(['docker', 'compose', 'up', '-d'], 
                                check=True, capture_output=True, text=True)
        print("✓ Redis and Neo4j services started successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to start services: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        return False

def check_service_availability(host, port, service_name, timeout=10):
    """
    Check if a service is available at the specified host and port.
    
    Args:
        host (str): Host address
        port (int): Port number
        service_name (str): Name of the service for logging
        timeout (int): Timeout in seconds
        
    Returns:
        bool: True if service is available, False otherwise
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        if result == 0:
            print(f"{service_name} is available at {host}:{port}")
            return True
        else:
            print(f"{service_name} is not available at {host}:{port}")
            return False
    except Exception as e:
        print(f"Error checking {service_name} availability: {e}")
        return False

def run_agents():
    """
    Directly run all the ECE agents in subprocesses
    """
    import threading
    import importlib.util
    import sys
    import os
    
    # Define the agents to run (excluding the model server which should be managed separately)
    agents = [
        {"name": "Orchestrator", "path": "ece/agents/tier1/orchestrator/main.py", "port": 8000},
        {"name": "Distiller", "path": "ece/agents/tier3/distiller/distiller_agent.py", "port": 8001},
        {"name": "QLearning", "path": "ece/agents/tier3/qlearning/qlearning_app.py", "port": 8002},
        {"name": "Archivist", "path": "ece/agents/tier3/archivist/archivist_agent.py", "port": 8003},
        {"name": "Injector", "path": "ece/agents/tier3/injector/injector_app.py", "port": 8004},
        {"name": "FileSystem", "path": "ece/agents/tier2/filesystem_agent.py", "port": 8006},
        {"name": "WebSearch", "path": "ece/agents/tier2/web_search_app.py", "port": 8007},
    ]

    # Load configuration
    config_file = "config_executable.yaml" if os.path.exists("config_executable.yaml") else "config.yaml"
    try:
        with open(config_file, "r") as f:
            config = yaml.safe_load(f)
    except FileNotFoundError:
        print(f"Error: {config_file} not found. Please ensure the configuration file exists.")
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"Error parsing {config_file}: {e}")
        sys.exit(1)

    # Verify required services are available before starting agents
    print("Verifying required services...")
    
    # Check Redis availability
    redis_url = config.get("cache", {}).get("redis_url", "redis://localhost:6379")
    try:
        from urllib.parse import urlparse
        redis_parsed = urlparse(redis_url)
        redis_host = redis_parsed.hostname or "localhost"
        redis_port = redis_parsed.port or 6379
        if not check_service_availability(redis_host, redis_port, "Redis"):
            print("Warning: Redis service not available. Some features may not work correctly.")
    except Exception as e:
        print(f"Warning: Could not parse Redis URL: {e}")
    
    # Check Neo4j availability
    neo4j_uri = config.get("archivist", {}).get("uri", "neo4j://localhost:7687")
    try:
        from urllib.parse import urlparse
        neo4j_parsed = urlparse(neo4j_uri)
        neo4j_host = neo4j_parsed.hostname or "localhost"
        neo4j_port = neo4j_parsed.port or 7687
        if not check_service_availability(neo4j_host, neo4j_port, "Neo4j"):
            print("Warning: Neo4j service not available. Some features may not work correctly.")
    except Exception as e:
        print(f"Warning: Could not parse Neo4j URI: {e}")

    # Add the project root to sys.path to ensure modules can be found
    # when running as a PyInstaller executable
    if getattr(sys, 'frozen', False):
        # Running as compiled executable
        application_path = os.path.dirname(sys.executable)
        project_root = os.path.dirname(os.path.dirname(application_path))
        if project_root not in sys.path:
            sys.path.insert(0, project_root)
    else:
        # Running as script
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if project_root not in sys.path:
            sys.path.insert(0, project_root)

    # Store references to threads
    threads = []
    
    for agent in agents:
        def start_agent(agent_path, port, name):
            """Function to start a single agent using uvicorn"""
            print(f"Starting {name} on port {port}...")
            
            # Convert file path to module path
            module_name = agent_path.replace('/', '.').replace('.py', '')
            
            try:
                # Import the agent module dynamically
                agent_module = importlib.import_module(module_name)
                
                # Get the app instance from the agent module
                if hasattr(agent_module, 'app'):
                    app = agent_module.app
                    import uvicorn
                    # Run the uvicorn server for this agent
                    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
                else:
                    print(f"Warning: {module_name} does not have an 'app' attribute")
            except ImportError as e:
                print(f"Error importing {module_name}: {e}")

        # Create and start a thread for each agent
        thread = threading.Thread(target=start_agent, args=(agent['path'], agent["port"], agent["name"]))
        thread.daemon = True  # Dies when main thread dies
        threads.append(thread)
        thread.start()
        time.sleep(2)  # Small delay between starting each agent

    print("\nAll agents are running.")
    print("Press Ctrl+C to stop all agents.")

    # Keep the main thread alive until interrupted
    try:
        # Wait indefinitely
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping all agents...")

def main():
    parser = argparse.ArgumentParser(description='Start ECE ecosystem (Redis, Neo4j, and agents)')
    parser.add_argument('--skip-docker', action='store_true', 
                       help='Skip starting Docker services (Redis and Neo4j)')
    
    args = parser.parse_args()
    
    print("External Context Engine (ECE) Ecosystem Starter")
    print("=" * 50)
    
    if not args.skip_docker:
        if not start_docker_services():
            print("Failed to start Docker services. Exiting.")
            return 1
    
    print("\nWaiting 10 seconds for services to initialize...")
    time.sleep(10)
    
    # Run the agents directly within this script
    run_agents()
    
    print("\nECE ecosystem is running!")
    print("- Redis: localhost:6379")
    print("- Neo4j: localhost:7687")
    print("- ECE Orchestrator: localhost:8000")
    print("- Other agents on ports 8001-8007")

if __name__ == "__main__":
    main()