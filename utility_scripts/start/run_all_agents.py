import subprocess
import sys
import time
import yaml
import os
import sys
import logging

# Add the utility_scripts directory to the Python path
script_dir = os.path.dirname(os.path.abspath(__file__))
utility_scripts_dir = os.path.join(script_dir, 'utility_scripts')
sys.path.insert(0, utility_scripts_dir)

from ece.common.windows_memory_limiter import apply_memory_limit
from dotenv import load_dotenv

# Import single instance hook to prevent multiple executions
import single_instance_hook

# Load environment variables from .env file
load_dotenv()

# Setup logging
try:
    from ece.common.logging_config import setup_logging
    loggers = setup_logging()
    logger = loggers['ecosystem']
    logger.info("ECE ecosystem logging initialized")
except Exception as e:
    # Fallback to basic logging if setup fails
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    logger.warning(f"Could not initialize ECE logging system: {e}")

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

def load_config():
    """Loads the application configuration from config.yaml or config_executable.yaml."""
    config_file = "config_executable.yaml" if os.path.exists("config_executable.yaml") else "config.yaml"
    try:
        with open(config_file, "r") as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        print(f"Error: {config_file} not found. Please ensure the configuration file exists.")
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"Error parsing {config_file}: {e}")
        sys.exit(1)

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
    import socket
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        if result == 0:
            logger.info(f"{service_name} is available at {host}:{port}")
            return True
        else:
            logger.warning(f"{service_name} is not available at {host}:{port}")
            return False
    except Exception as e:
        logger.error(f"Error checking {service_name} availability: {e}")
        return False

def run_agents(config):
    """
    Runs all the ECE agents as separate processes with staggered startup to reduce memory usage.
    """
    # Verify required services are available before starting agents
    print("Verifying required services...")
    logger.info("Verifying required services...")
    
    # Check Redis availability
    redis_url = config.get("cache", {}).get("redis_url", "redis://localhost:6379")
    try:
        from urllib.parse import urlparse
        redis_parsed = urlparse(redis_url)
        redis_host = redis_parsed.hostname or "localhost"
        redis_port = redis_parsed.port or 6379
        if not check_service_availability(redis_host, redis_port, "Redis"):
            print("Warning: Redis service not available. Some features may not work correctly.")
            logger.warning("Redis service not available. Some features may not work correctly.")
    except Exception as e:
        print(f"Warning: Could not parse Redis URL: {e}")
        logger.warning(f"Could not parse Redis URL: {e}")
    
    # Check Neo4j availability
    neo4j_uri = config.get("archivist", {}).get("uri", "neo4j://localhost:7687")
    try:
        from urllib.parse import urlparse
        neo4j_parsed = urlparse(neo4j_uri)
        neo4j_host = neo4j_parsed.hostname or "localhost"
        neo4j_port = neo4j_parsed.port or 7687
        if not check_service_availability(neo4j_host, neo4j_port, "Neo4j"):
            print("Warning: Neo4j service not available. Some features may not work correctly.")
            logger.warning("Neo4j service not available. Some features may not work correctly.")
    except Exception as e:
        print(f"Warning: Could not parse Neo4j URI: {e}")
        logger.warning(f"Could not parse Neo4j URI: {e}")
    
    processes = []
    try:
        for agent in agents:
            # Apply memory limit to each agent process individually if on Windows
            if sys.platform == 'win32':
                memory_limit = config.get("system", {}).get("resources", {}).get("memory_limit_mb", 0)
                if memory_limit > 0:
                    # We'll manage memory limits per process differently
                    pass  # The memory limit will be applied through subprocess environment
            
            # Set an environment variable to indicate this is a subprocess
            # This will be used by the single instance hook to skip the check
            env = os.environ.copy()
            env["ECE_AGENT_SUBPROCESS"] = "1"
            
            # Add memory limit to the subprocess environment
            memory_limit = config.get("system", {}).get("resources", {}).get("memory_limit_mb", 0)
            if memory_limit > 0:
                env["ECE_MEMORY_LIMIT_MB"] = str(memory_limit)
            
            # Add logging configuration to subprocess environment
            env["ECE_LOG_COMPONENT"] = agent['name'].lower()
            
            command = [
                sys.executable,
                "-m",
                "uvicorn",
                f"{agent['path'].replace('/', '.').replace('.py', '')}:app",
                "--host",
                "0.0.0.0",
                "--port",
                str(agent["port"]),
                "--log-level", "info",  # Ensure logging level is set
                "--access-log",  # Enable access logging
            ]
            print(f"Starting {agent['name']} on port {agent['port']}...")
            logger.info(f"Starting {agent['name']} on port {agent['port']}...")
            process = subprocess.Popen(command, env=env)
            processes.append(process)
            time.sleep(5)  # Increased delay to 5 seconds to allow each agent to initialize properly and reduce peak memory usage

        print("\nAll agents are running.")
        logger.info("All agents are running.")
        print("Press Ctrl+C to stop all agents.")

        # Wait for all processes to complete
        for process in processes:
            process.wait()
    except KeyboardInterrupt:
        print("\nStopping all agents...")
        logger.info("Stopping all agents due to keyboard interrupt...")
        for process in processes:
            try:
                process.terminate()
                process.wait(timeout=5)  # Wait up to 5 seconds for graceful shutdown
            except subprocess.TimeoutExpired:
                print(f"Forcefully killing process {process.pid}")
                logger.warning(f"Forcefully killing process {process.pid}")
                process.kill()  # Force kill if not responding
        print("All agents stopped.")
        logger.info("All agents stopped.")
    except Exception as e:
        print(f"Error running agents: {e}")
        logger.error(f"Error running agents: {e}", exc_info=True)
        # Ensure all processes are cleaned up in case of an exception
        for process in processes:
            try:
                process.terminate()
                process.wait(timeout=2)
            except:
                # If process is already dead or can't be terminated, continue
                try:
                    process.kill()
                except:
                    pass
        raise  # Re-raise the original exception

if __name__ == "__main__":
    config = load_config()
    run_agents(config)