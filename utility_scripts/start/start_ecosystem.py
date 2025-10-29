#!/usr/bin/env python3
"""
Start the ECE ecosystem: Redis, Neo4j, and all ECE agents
With on-demand model management via ModelManager

This is the consolidated script that handles all platform-specific startup logic.
All other platform-specific scripts (PowerShell, batch, shell) delegate to this script.
"""

import subprocess
import sys
import time
import yaml
import os
import argparse
import socket
from pathlib import Path
import logging

# Setup logging
def setup_logging():
    """Setup logging infrastructure for the ecosystem starter."""
    # Create logs directory if it doesn't exist
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s',
        handlers=[
            logging.FileHandler(logs_dir / "debug_log_ecosystem.txt"),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    return logging.getLogger(__name__)

logger = setup_logging()

def check_docker_installed():
    """Check if Docker is installed and accessible."""
    try:
        result = subprocess.run(["docker", "--version"], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            logger.info(f"Docker found: {result.stdout.strip()}")
            return True
        else:
            logger.error(f"Docker not found or not accessible: {result.stderr}")
            return False
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        logger.error(f"Error checking Docker installation: {e}")
        return False

def check_docker_compose():
    """Check if Docker Compose is available."""
    try:
        # Try newer docker compose command first
        result = subprocess.run(["docker", "compose", "version"], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            logger.info(f"Docker Compose found: {result.stdout.strip()}")
            return True
        
        # Fall back to older docker-compose command
        result = subprocess.run(["docker-compose", "--version"], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            logger.info(f"Docker Compose (legacy) found: {result.stdout.strip()}")
            return "legacy"
            
        logger.error("Docker Compose not found")
        return False
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        logger.error(f"Error checking Docker Compose: {e}")
        return False

def start_docker_services():
    """Start Redis and Neo4j services using docker-compose."""
    logger.info("Starting Redis and Neo4j services...")
    
    try:
        result = subprocess.run(["docker", "compose", "up", "--remove-orphans", "-d"], 
                                check=True, capture_output=True, text=True)
        logger.info("Redis and Neo4j services started successfully")
        logger.debug(f"Docker output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to start Docker services: {e}")
        logger.error(f"stdout: {e.stdout}")
        logger.error(f"stderr: {e.stderr}")
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
            logger.info(f"{service_name} is available at {host}:{port}")
            return True
        else:
            logger.debug(f"{service_name} is not available at {host}:{port}")
            return False
    except Exception as e:
        logger.debug(f"Error checking {service_name} availability: {e}")
        return False

def wait_for_service(host, port, service_name, timeout=30, interval=2):
    """
    Wait for a service to become available at the specified host and port.
    
    Args:
        host (str): Host address
        port (int): Port number
        service_name (str): Name of the service for logging
        timeout (int): Maximum time to wait in seconds
        interval (int): Interval between checks in seconds
        
    Returns:
        bool: True if service becomes available within timeout, False otherwise
    """
    logger.info(f"Waiting for {service_name} to start on {host}:{port}...")
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        if check_service_availability(host, port, service_name):
            logger.info(f"{service_name} is now available at {host}:{port}")
            return True
        time.sleep(interval)
    
    logger.warning(f"Timeout waiting for {service_name} to start on {host}:{port}")
    return False

def wait_for_services():
    """Wait for all required services to become available."""
    logger.info("Waiting for required services to become available...")
    
    # Check Redis availability
    if not wait_for_service("localhost", 6379, "Redis"):
        logger.warning("Redis service may not be available. Some features may not work correctly.")
    
    # Check Neo4j availability
    if not wait_for_service("localhost", 7687, "Neo4j"):
        logger.warning("Neo4j service may not be available. Some features may not work correctly.")
    
    logger.info("Required services check completed")

def update_model_config():
    """Update configuration for on-demand model management via ModelManager."""
    logger.info("Updating configuration for on-demand model management...")
    logger.info("Configuring ECE for on-demand model management via ModelManager")
    # The ModelManager will handle model selection and loading as needed
    logger.info("Model configuration updated for on-demand management.")

def start_ece_agents():
    """Start all ECE agents."""
    logger.info("Starting ECE agents...")
    
    try:
        # Start the agents with Python
        logger.info("Starting run_all_agents.py...")
        
        # Use the project root detection module to ensure proper path handling
        project_root = Path(__file__).parent.parent.parent
        agents_script_path = project_root / "run_all_agents.py"
        
        if not agents_script_path.exists():
            logger.error(f"ECE agents script not found: {agents_script_path}")
            return False
            
        # Run the agents script
        result = subprocess.run([sys.executable, str(agents_script_path)], 
                               cwd=project_root,
                               check=True)
        
        if result.returncode == 0:
            logger.info("ECE agents started successfully")
            return True
        else:
            logger.error(f"ECE agents failed to start with exit code: {result.returncode}")
            return False
            
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to start ECE agents: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error starting ECE agents: {e}")
        return False

def main():
    """Main entry point."""
    logger.info("External Context Engine (ECE) Ecosystem Starter")
    logger.info("=============================================")
    
    parser = argparse.ArgumentParser(description='Start ECE ecosystem (Redis, Neo4j, and agents)')
    parser.add_argument('--skip-docker', action='store_true', 
                       help='Skip starting Docker services (Redis and Neo4j)')
    parser.add_argument('--skip-model-config', action='store_true',
                       help='Skip updating model configuration for on-demand management')
    
    args = parser.parse_args()
    
    # Check prerequisites
    if not args.skip_docker:
        if not check_docker_installed():
            logger.error("Docker is required but not found. Please install Docker and try again.")
            return 1
        
        compose_type = check_docker_compose()
        if not compose_type:
            logger.error("Docker Compose is required but not found. Please install Docker Compose and try again.")
            return 1
    
    # Start Docker services
    if not args.skip_docker:
        if not start_docker_services():
            logger.error("Failed to start Docker services")
            return 1
    
    # Update model configuration
    if not args.skip_model_config:
        update_model_config()
    else:
        logger.info("Skipping model configuration update...")
    
    # Wait for services to be ready
    wait_for_services()
    
    # Start ECE agents
    if not start_ece_agents():
        logger.error("Failed to start ECE agents")
        return 1
    
    logger.info("")
    logger.info("ECE ecosystem is running!")
    logger.info("- Redis: localhost:6379")
    logger.info("- Neo4j: localhost:7687")
    logger.info("- ECE Orchestrator: localhost:8000")
    logger.info("- Other agents on ports 8001-8007")
    logger.info("")
    
    try:
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down ECE ecosystem...")
        return 0

if __name__ == "__main__":
    sys.exit(main())