#!/usr/bin/env python3
"""
ECE Launcher - Main entry point for the External Context Engine executable
Handles Docker container management, ECE agent orchestration, and logging.
"""

import subprocess
import sys
import os
import time
import logging
import traceback
from pathlib import Path
import argparse
import shutil
import signal
import threading
import atexit
from typing import Optional, List

# Setup logging
def setup_logging():
    """Setup logging infrastructure for all components."""
    # Create logs directory if it doesn't exist
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s',
        handlers=[
            logging.FileHandler(logs_dir / "ece_launcher.log"),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    return logging.getLogger(__name__)

logger = setup_logging()

class GracefulShutdownHandler:
    """Handles graceful shutdown of all processes and threads."""
    
    def __init__(self):
        self.processes: List[subprocess.Popen] = []
        self.threads: List[threading.Thread] = []
        self.shutdown_initiated = False
        self.lock = threading.Lock()
        
        # Register signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        # Register atexit handler
        atexit.register(self._cleanup)
    
    def register_process(self, process: subprocess.Popen):
        """Register a process for graceful shutdown."""
        with self.lock:
            if not self.shutdown_initiated:
                self.processes.append(process)
                logger.debug(f"Registered process PID {process.pid} for graceful shutdown")
    
    def register_thread(self, thread: threading.Thread):
        """Register a thread for graceful shutdown."""
        with self.lock:
            if not self.shutdown_initiated:
                self.threads.append(thread)
                logger.debug(f"Registered thread {thread.name} for graceful shutdown")
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self.initiate_shutdown()
    
    def initiate_shutdown(self):
        """Initiate graceful shutdown of all registered processes and threads."""
        with self.lock:
            if self.shutdown_initiated:
                return
            self.shutdown_initiated = True
        
        logger.info("Shutting down all processes and threads...")
        
        # Terminate all processes
        for process in self.processes:
            try:
                if process.poll() is None:  # Process is still running
                    logger.info(f"Terminating process PID {process.pid}")
                    process.terminate()
            except Exception as e:
                logger.error(f"Error terminating process PID {process.pid}: {e}")
        
        # Wait for processes to terminate gracefully
        timeout = 10
        start_time = time.time()
        
        for process in self.processes:
            try:
                if process.poll() is None:  # Process is still running
                    remaining_time = max(0, timeout - (time.time() - start_time))
                    if remaining_time > 0:
                        logger.info(f"Waiting for process PID {process.pid} to terminate gracefully...")
                        process.wait(timeout=remaining_time)
                        logger.info(f"Process PID {process.pid} terminated gracefully")
            except subprocess.TimeoutExpired:
                logger.warning(f"Process PID {process.pid} did not terminate gracefully, forcing kill...")
                try:
                    process.kill()
                    process.wait(timeout=2)  # Wait for force kill to complete
                    logger.info(f"Process PID {process.pid} killed forcefully")
                except Exception as e:
                    logger.error(f"Error force-killing process PID {process.pid}: {e}")
            except Exception as e:
                logger.error(f"Error waiting for process PID {process.pid}: {e}")
        
        # Wait for threads to finish gracefully
        for thread in self.threads:
            try:
                if thread.is_alive():
                    logger.info(f"Waiting for thread {thread.name} to finish...")
                    # Note: We can't forcefully stop threads, so we just wait
                    # They should finish gracefully as the main system shuts down
                    thread.join(timeout=timeout)
                    if thread.is_alive():
                        logger.warning(f"Thread {thread.name} did not finish gracefully within timeout")
                    else:
                        logger.info(f"Thread {thread.name} finished gracefully")
            except Exception as e:
                logger.error(f"Error waiting for thread {thread.name}: {e}")
        
        logger.info("All processes and threads shut down")
    
    def _cleanup(self):
        """Cleanup handler called at exit."""
        self.initiate_shutdown()

# Global shutdown handler
shutdown_handler = GracefulShutdownHandler()

class ComponentLogger:
    """Handles logging for different components with separate log files."""
    
    def __init__(self, component_name):
        self.component_name = component_name
        self.logs_dir = Path("logs")
        self.logs_dir.mkdir(exist_ok=True)
        
        # Create component-specific logger
        self.logger = logging.getLogger(f"ece.{component_name}")
        self.logger.setLevel(logging.INFO)
        
        # Create file handler for component
        file_handler = logging.FileHandler(self.logs_dir / f"{component_name}.log")
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s'
        ))
        self.logger.addHandler(file_handler)
        
        # Create console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(logging.Formatter(
            f'%(asctime)s [{component_name.upper()}] %(message)s'
        ))
        self.logger.addHandler(console_handler)
    
    def info(self, message):
        self.logger.info(message)
    
    def error(self, message):
        self.logger.error(message)
    
    def warning(self, message):
        self.logger.warning(message)
    
    def debug(self, message):
        self.logger.debug(message)

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

def start_docker_services(compose_file="docker-compose.yml"):
    """Start Docker services with orphan cleanup."""
    logger.info("Starting Docker services...")
    
    # Check if docker-compose file exists
    if not Path(compose_file).exists():
        logger.error(f"Docker Compose file not found: {compose_file}")
        return False
    
    try:
        # Use docker compose with orphan removal
        cmd = ["docker", "compose", "up", "--remove-orphans", "-d"]
        logger.info(f"Running command: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            logger.info("Docker services started successfully")
            logger.debug(f"Docker output: {result.stdout}")
            return True
        else:
            logger.error(f"Failed to start Docker services: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        logger.error("Docker compose command timed out")
        return False
    except Exception as e:
        logger.error(f"Error starting Docker services: {e}")
        return False

def check_required_services():
    """Check if required services (Redis, Neo4j) are running."""
    import socket
    
    services = [
        {"name": "Redis", "host": "localhost", "port": 6379},
        {"name": "Neo4j", "host": "localhost", "port": 7687}
    ]
    
    all_ready = True
    for service in services:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((service["host"], service["port"]))
            sock.close()
            
            if result == 0:
                logger.info(f"{service['name']} is available at {service['host']}:{service['port']}")
            else:
                logger.warning(f"{service['name']} is not available at {service['host']}:{service['port']}")
                all_ready = False
        except Exception as e:
            logger.error(f"Error checking {service['name']} availability: {e}")
            all_ready = False
    
    return all_ready

def wait_for_services(max_attempts=30, delay=2):
    """Wait for required services to become available."""
    logger.info("Waiting for required services to become available...")
    
    for attempt in range(max_attempts):
        if check_required_services():
            logger.info("All required services are available")
            return True
        else:
            logger.info(f"Services not ready, waiting {delay} seconds... (Attempt {attempt + 1}/{max_attempts})")
            time.sleep(delay)
    
    logger.error("Required services did not become available in time")
    return False

def start_ece_agents():
    """Start ECE agents by directly importing and running the agents."""
    logger.info("Starting ECE agents...")
    
    try:
        # Set environment variable to indicate this is being run from the launcher
        # This will allow the single instance hook to work properly
        os.environ["ECE_AGENT_SUBPROCESS"] = "1"
        
        # Import and run the agents directly instead of using subprocess+uv
        # This avoids potential issues with PyInstaller executable subprocess spawning
        import importlib.util
        import sys
        import threading
        
        # In both executable and development environments, import the required functions
        try:
            from .run_all_agents import load_config, run_agents
            # Create a temporary module-like object to hold the functions we need
            import types
            agents_module = types.ModuleType('run_all_agents')
            agents_module.load_config = load_config
            agents_module.run_agents = run_agents
        except ImportError:
            # Fallback for cases where direct import doesn't work (e.g., if PyInstaller path issues)
            try:
                # Try importing from the parent package
                from run_all_agents import load_config, run_agents
                import types
                agents_module = types.ModuleType('run_all_agents')
                agents_module.load_config = load_config
                agents_module.run_agents = run_agents
            except ImportError:
                # Fallback to dynamic loading for special cases
                import importlib.util
                agents_script_path = os.path.join(os.path.dirname(__file__), "run_all_agents.py")
                spec = importlib.util.spec_from_file_location("run_all_agents", agents_script_path)
                agents_module = importlib.util.module_from_spec(spec)
                
                # Execute the module 
                spec.loader.exec_module(agents_module)
        
        # Load config using the function from run_all_agents module
        config = agents_module.load_config()
        
        # Create a thread to run the agents to avoid blocking the launcher
        def run_agents_in_thread():
            """Run agents in a separate thread to avoid blocking the launcher."""
            try:
                agents_module.run_agents(config)
            except Exception as e:
                logger.error(f"Error in agent thread: {e}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Start the agents in a daemon thread
        agents_thread = threading.Thread(target=run_agents_in_thread, daemon=True, name="ECE-Agents-Thread")
        agents_thread.start()
        
        # Register thread for graceful shutdown
        shutdown_handler.register_thread(agents_thread)
        
        logger.info("ECE agents started in background thread")
        return agents_thread  # Return the thread object for monitoring purposes
        
    except Exception as e:
        logger.error(f"Error starting ECE agents: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None

def monitor_subprocess(thread, component_name):
    """Monitor an agent thread."""
    if not thread:
        return
    
    component_logger = ComponentLogger(component_name)
    
    try:
        logger.info(f"Monitoring {component_name}...")
        
        # For thread monitoring, we just need to check if it's alive
        while thread.is_alive() and not shutdown_handler.shutdown_initiated:
            time.sleep(1)  # Check every second
        
        # Thread completed or shutdown initiated
        if not thread.is_alive():
            logger.info(f"{component_name} thread completed")
        else:
            logger.info(f"{component_name} thread shutdown initiated")
        
    except Exception as e:
        logger.error(f"Error monitoring {component_name}: {e}")

def main():
    """Main entry point."""
    logger.info("ECE Launcher starting...")
    
    # Check prerequisites
    if not check_docker_installed():
        logger.error("Docker is required but not found. Please install Docker and try again.")
        return 1
    
    compose_type = check_docker_compose()
    if not compose_type:
        logger.error("Docker Compose is required but not found. Please install Docker Compose and try again.")
        return 1
    
    # Start Docker services
    if not start_docker_services():
        logger.error("Failed to start Docker services")
        return 1
    
    # Wait for services to be ready
    if not wait_for_services():
        logger.error("Required services did not become available")
        return 1
    
    # Start ECE agents
    ece_process = start_ece_agents()
    if not ece_process:
        logger.error("Failed to start ECE agents")
        return 1
    
    logger.info("ECE Launcher is running. Press Ctrl+C to stop.")
    
    try:
        # Monitor ECE agents in a separate thread
        monitor_thread = threading.Thread(
            target=monitor_subprocess, 
            args=(ece_process, "ece_agents"),
            daemon=True
        )
        monitor_thread.start()
        
        # Keep main thread alive
        while not shutdown_handler.shutdown_initiated and ece_process.is_alive():
            time.sleep(1)
        
        # Wait for monitor thread to complete
        monitor_thread.join(timeout=5)
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())