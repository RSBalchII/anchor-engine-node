#!/usr/bin/env python3
"""
Simplified ECE Startup Script

This script starts both the ECE ecosystem and the llama.cpp model server
with proper logging to the logs/ directory.
"""

import subprocess
import sys
import time
import os
import argparse
import logging
from pathlib import Path
import signal
import psutil
import requests
from dotenv import dotenv_values

# Load environment variables from .env file
config = dotenv_values(".env")  # Load environment variables

# Setup logging
def setup_logging():
    """Setup logging infrastructure for the simplified startup."""
    # Create logs directory if it doesn't exist
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Get log file name from environment, default to debug_log_simplified_startup.txt
    log_file = os.getenv('LOG_FILE_SIMPLIFIED_STARTUP', 'debug_log_simplified_startup.txt')
    
    # Configure root logger with proper encoding
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s',
        handlers=[
            logging.FileHandler(logs_dir / log_file, encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    return logging.getLogger(__name__)

logger = setup_logging()

class SimplifiedECEStartup:
    def __init__(self):
        self.processes = []
        self.running = True
        
    def find_llama_cpp_server(self):
        """Find the llama.cpp server executable."""
        # Check if server executable path is specified in environment variable
        server_exe_path = os.getenv('LLAMA_CPP_SERVER_PATH')
        if server_exe_path:
            server_exe = Path(server_exe_path)
            if server_exe.exists():
                logger.info(f"Found llama.cpp server executable from environment: {server_exe}")
                return server_exe
        
        # Common locations for the server executable
        possible_paths = [
            Path("llama.cpp/server.exe"),           # Windows
            Path("llama.cpp/server"),               # Linux/Mac
            Path("llama.cpp/llama-server.exe"),     # Windows alternative
            Path("llama.cpp/llama-server"),         # Linux/Mac alternative
            Path("llama.cpp/bin/Release/server.exe"),  # Windows build
            Path("llama.cpp/build/bin/Release/server.exe"),  # Windows build
            Path("llama.cpp/build/bin/server.exe"),  # Alternative Windows build
            Path("llama.cpp/build/server.exe"),     # Another alternative Windows build
            Path("llama.cpp/build/bin/Release/llama-server.exe"),  # Windows build alternative name
            Path("llama.cpp/build/bin/llama-server.exe"),  # Alternative Windows build alternative name
            Path("llama.cpp/build/llama-server.exe"),     # Another alternative Windows build alternative name
            Path("llama.cpp/bin/server.exe"),       # Alternative Windows build location
            Path("llama.cpp/bin/llama-server.exe"), # Alternative Windows build location alternative name
        ]
        
        # Also check in the build directory after cmake build
        build_dirs = [
            Path("llama.cpp/build"),
            Path("llama.cpp/build/bin"),
            Path("llama.cpp/build/bin/Release"),
            Path("llama.cpp/bin"),
            Path("llama.cpp/bin/Release"),
        ]
        
        # Check for executable files in build directories
        for build_dir in build_dirs:
            if build_dir.exists():
                # Look for server executables in the build directory
                for exe_name in ["server.exe", "server", "llama-server.exe", "llama-server"]:
                    exe_path = build_dir / exe_name
                    if exe_path.exists():
                        logger.info(f"Found llama.cpp server executable: {exe_path}")
                        return exe_path
        
        # Check the predefined paths
        for path in possible_paths:
            if path.exists():
                logger.info(f"Found llama.cpp server executable: {path}")
                return path
                
        logger.warning("llama.cpp server executable not found in common locations")
        logger.info("")
        logger.info("Troubleshooting llama.cpp server:")
        logger.info("- Make sure llama.cpp is properly cloned in the llama.cpp directory")
        logger.info("- Build llama.cpp using CMake and a C++ compiler")
        logger.info("- Install build tools (CMake and C++ compiler) if not already installed")
        logger.info("- Download a pre-built llama.cpp server binary from https://github.com/ggerganov/llama.cpp/releases")
        logger.info("- Install llama-cpp-python: pip install llama-cpp-python")
        logger.info("- Use a different model serving approach")
        logger.info("")
        logger.info("Alternative solutions:")
        logger.info("1. Install Visual Studio Community with C++ development tools and try again")
        logger.info("2. Install CMake from https://cmake.org/download/")
        logger.info("3. Install MinGW-w64 for Windows or GCC for Linux/Mac")
        logger.info("4. Download a pre-built llama.cpp server binary from the releases page")
        logger.info("5. Install llama-cpp-python package: pip install llama-cpp-python")
        return None

    def build_llama_cpp(self):
        """Build llama.cpp if not already built."""
        logger.info("Attempting to build llama.cpp...")
        
        # Check if llama.cpp directory exists
        if not Path("llama.cpp").exists():
            logger.error("llama.cpp directory not found")
            logger.info("")
            logger.info("Troubleshooting llama.cpp build:")
            logger.info("- Make sure llama.cpp is properly cloned in the llama.cpp directory")
            logger.info("- Clone llama.cpp: git clone https://github.com/ggerganov/llama.cpp")
            logger.info("- Check that the llama.cpp directory exists in the current directory")
            return False
        
        # Check if build tools are available
        if not self.check_build_tools():
            logger.error("Build tools not found. Please install CMake and a C++ compiler (Visual Studio, GCC, or Clang)")
            logger.info("")
            logger.info("Alternative solutions:")
            logger.info("1. Install Visual Studio Community with C++ development tools")
            logger.info("2. Install CMake from https://cmake.org/download/")
            logger.info("3. Install MinGW-w64 for Windows or GCC for Linux/Mac")
            logger.info("4. Use a pre-built llama.cpp server binary")
            logger.info("5. Install llama-cpp-python package: pip install llama-cpp-python")
            logger.info("")
            logger.info("For more information, see the documentation in README.md")
            return False
        
        try:
            # Try to build using cmake
            logger.info("Building llama.cpp with cmake...")
            
            # Create build directory
            build_dir = Path("llama.cpp/build")
            build_dir.mkdir(exist_ok=True)
            
            # Configure CMake
            cmake_cmd = [
                "cmake", "..", 
                "-G", "Visual Studio 17 2022"  # Windows default
            ]
            
            # Check if we're on a non-Windows system
            import platform
            if platform.system().lower() != "windows":
                cmake_cmd = ["cmake", ".."]  # Linux/Mac default
            
            result = subprocess.run(cmake_cmd, cwd=build_dir, capture_output=True, text=True, timeout=60)
            if result.returncode != 0:
                logger.error(f"CMake configuration failed: {result.stderr}")
                logger.info("")
                logger.info("Troubleshooting CMake configuration:")
                logger.info("- Try installing Visual Studio Community with C++ development tools")
                logger.info("- Install CMake from https://cmake.org/download/")
                logger.info("- Check that the CMake version is compatible with llama.cpp")
                logger.info("- Verify that all required dependencies are installed")
                logger.info("- Try running cmake manually: cd llama.cpp/build && cmake ..")
                logger.info("")
                logger.info("For more information, see the documentation in README.md")
                return False
            
            # Build
            build_cmd = ["cmake", "--build", ".", "--config", "Release"]
            result = subprocess.run(build_cmd, cwd=build_dir, capture_output=True, text=True, timeout=300)
            if result.returncode != 0:
                logger.error(f"Build failed: {result.stderr}")
                logger.info("")
                logger.info("Troubleshooting build process:")
                logger.info("- Try installing Visual Studio Community with C++ development tools")
                logger.info("- Check that the CMake configuration was successful")
                logger.info("- Verify that all required dependencies are installed")
                logger.info("- Try running the build manually: cd llama.cpp/build && cmake --build . --config Release")
                logger.info("- Check the build logs for detailed error information")
                logger.info("")
                logger.info("For more information, see the documentation in README.md")
                return False
                
            logger.info("[SUCCESS] llama.cpp built successfully")
            return True
        except subprocess.TimeoutExpired:
            logger.error("Build timed out")
            logger.info("")
            logger.info("Troubleshooting build timeout:")
            logger.info("- The build process may take a long time on slower systems")
            logger.info("- Increase the timeout value in the script if needed")
            logger.info("- Check system resources (CPU, memory, disk space)")
            logger.info("- Try building manually: cd llama.cpp/build && cmake --build . --config Release")
            logger.info("")
            logger.info("For more information, see the documentation in README.md")
            return False
        except Exception as e:
            logger.error(f"Error building llama.cpp: {e}")
            logger.info("")
            logger.info("Troubleshooting build errors:")
            logger.info("- Make sure all build tools are properly installed")
            logger.info("- Check that the llama.cpp directory structure is correct")
            logger.info("- Verify that all required dependencies are installed")
            logger.info("- Try building manually: cd llama.cpp/build && cmake --build . --config Release")
            logger.info("- Check the build logs for detailed error information")
            logger.info("")
            logger.info("For more information, see the documentation in README.md")
            return False

    def check_build_tools(self):
        """Check if required build tools are available."""
        try:
            # Check for cmake
            cmake_result = subprocess.run(["cmake", "--version"], capture_output=True, text=True, timeout=10)
            if cmake_result.returncode != 0:
                logger.warning("CMake not found")
                logger.info("")
                logger.info("Troubleshooting build tools:")
                logger.info("- Install CMake from https://cmake.org/download/")
                logger.info("- Make sure CMake is added to your PATH environment variable")
                logger.info("- Restart your terminal/command prompt after installing CMake")
                logger.info("- Check that the CMake version is compatible with llama.cpp")
                return False
            
            # Check for compiler (try different options)
            compilers_to_check = [
                ["cl", "/?"],  # MSVC
                ["gcc", "--version"],  # GCC
                ["clang", "--version"]  # Clang
            ]
            
            compiler_found = False
            for compiler_cmd in compilers_to_check:
                try:
                    result = subprocess.run(compiler_cmd, capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        compiler_found = True
                        logger.info(f"Found compiler: {' '.join(compiler_cmd[:-1])}")
                        break
                except:
                    continue
            
            if not compiler_found:
                logger.warning("No C++ compiler found")
                logger.info("")
                logger.info("Troubleshooting build tools:")
                logger.info("- Install a C++ compiler (Visual Studio, GCC, or Clang)")
                logger.info("- For Windows: Install Visual Studio Community with C++ development tools")
                logger.info("- For Linux: Install GCC with 'sudo apt-get install build-essential'")
                logger.info("- For Mac: Install Xcode command line tools with 'xcode-select --install'")
                logger.info("- Make sure the compiler is added to your PATH environment variable")
                logger.info("- Restart your terminal/command prompt after installing the compiler")
                logger.info("- Check that the compiler version is compatible with llama.cpp")
                return False
                
            logger.info("[SUCCESS] Build tools found: CMake and C++ compiler")
            return True
        except Exception as e:
            logger.warning(f"Error checking build tools: {e}")
            logger.info("")
            logger.info("Troubleshooting build tools:")
            logger.info("- Install CMake from https://cmake.org/download/")
            logger.info("- Install a C++ compiler (Visual Studio, GCC, or Clang)")
            logger.info("- For Windows: Install Visual Studio Community with C++ development tools")
            logger.info("- For Linux: Install GCC with 'sudo apt-get install build-essential'")
            logger.info("- For Mac: Install Xcode command line tools with 'xcode-select --install'")
            logger.info("- Make sure all build tools are added to your PATH environment variable")
            logger.info("- Restart your terminal/command prompt after installing build tools")
            logger.info("- Check that the build tool versions are compatible with llama.cpp")
            return False

    def start_llama_server(self, model_path, port):
        """Start the llama.cpp server with the specified model."""
        logger.info(f"Starting llama.cpp server on port {port}...")
        logger.info(f"Using model: {model_path}")
        
        # Check if model file exists
        model_file = Path(model_path)
        if not model_file.exists():
            logger.error(f"Model file not found: {model_path}")
            logger.info("")
            logger.info("Troubleshooting model file:")
            logger.info("- Please download or place the model file in the models directory")
            logger.info("- Check that the model file path is correct")
            logger.info("- Verify that the model file exists in the specified location")
            logger.info("- Make sure the model file is a valid GGUF file")
            logger.info("- Check that you have sufficient permissions to access the model file")
            return False
        
        # Find server executable
        server_exe = self.find_llama_cpp_server()
        if not server_exe:
            logger.info("Attempting to build llama.cpp...")
            if self.build_llama_cpp():
                server_exe = self.find_llama_cpp_server()
            
            if not server_exe:
                logger.error("Cannot start llama.cpp server - executable not found and build failed")
                logger.info("")
                logger.info("Troubleshooting steps:")
                logger.info("1. Install build tools (CMake and C++ compiler) and try again")
                logger.info("2. Download a pre-built llama.cpp server binary")
                logger.info("3. Install llama-cpp-python: pip install llama-cpp-python")
                logger.info("4. Use a different model serving approach")
                logger.info("")
                logger.info("Alternative solutions:")
                logger.info("- Install Visual Studio Community with C++ development tools")
                logger.info("- Install CMake from https://cmake.org/download/")
                logger.info("- Install MinGW-w64 for Windows or GCC for Linux/Mac")
                logger.info("- Download a pre-built llama.cpp server binary from https://github.com/ggerganov/llama.cpp/releases")
                logger.info("- Install llama-cpp-python package: pip install llama-cpp-python")
                logger.info("")
                logger.info("For more information, see the documentation in README.md")
                return False
        
        # Get configuration from environment variables
        context_size = os.getenv('LLAMA_CPP_CONTEXT_SIZE', '4096')
        n_gpu_layers = os.getenv('LLAMA_CPP_N_GPU_LAYERS', '-1')
        timeout = os.getenv('LLAMA_CPP_TIMEOUT', '1800')
        
        # Build the command
        cmd = [
            str(server_exe),
            "-m", str(model_file),
            "-c", str(context_size),
            "--n-gpu-layers", str(n_gpu_layers),
            "--timeout", str(timeout),
            "--port", str(port),
            "--host", "0.0.0.0"
        ]
        
        logger.info(f"Running command: {' '.join(cmd)}")
        
        try:
            # Start the server process
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.processes.append(("llama.cpp server", process))
            logger.info(f"[SUCCESS] llama.cpp server started with PID {process.pid}")
            
            # Wait briefly to see if it starts successfully
            time.sleep(3)
            
            if process.poll() is not None:
                # Process has already exited
                stdout, stderr = process.communicate()
                logger.error(f"✗ llama.cpp server failed to start. Exit code: {process.returncode}")
                logger.error(f"stdout: {stdout.decode()}")
                logger.error(f"stderr: {stderr.decode()}")
                logger.info("")
                logger.info("Troubleshooting llama.cpp server startup:")
                logger.info("- Check that the model file is valid and compatible with llama.cpp")
                logger.info("- Verify that the model file path is correct")
                logger.info("- Ensure sufficient system resources (memory, GPU VRAM)")
                logger.info("- Check that the port is not already in use")
                logger.info("- Verify that the llama.cpp server executable is compatible with your system")
                logger.info("- Try running the command manually to see detailed error messages")
                logger.info("- Check the logs in the logs/ directory for more information")
                return False
            
            logger.info("[SUCCESS] llama.cpp server started successfully")
            return True
                
        except Exception as e:
            logger.error(f"Error starting llama.cpp server: {e}")
            logger.info("")
            logger.info("Troubleshooting llama.cpp server startup:")
            logger.info("- Check that the model file is valid and compatible with llama.cpp")
            logger.info("- Verify that the model file path is correct")
            logger.info("- Ensure sufficient system resources (memory, GPU VRAM)")
            logger.info("- Check that the port is not already in use")
            logger.info("- Verify that the llama.cpp server executable is compatible with your system")
            logger.info("- Try running the command manually to see detailed error messages")
            logger.info("- Check the logs in the logs/ directory for more information")
            return False

    def start_docker_services(self):
        """Start Redis and Neo4j services using docker-compose."""
        logger.info("Starting Redis and Neo4j services...")
        
        try:
            # Get docker compose file path from environment
            compose_file_path = os.getenv('DOCKER_COMPOSE_FILE', 'docker-compose.yml')
            compose_file = Path(compose_file_path)
            if not compose_file.exists():
                logger.error(f"Docker compose file not found: {compose_file_path}")
                logger.info("")
                logger.info("Troubleshooting Docker services:")
                logger.info("- Make sure you're running this script from the project root directory")
                logger.info(f"- Check that {compose_file_path} exists in the current directory")
                logger.info("- Verify Docker Desktop is installed and running")
                logger.info("- Ensure you have sufficient permissions to run Docker commands")
                logger.info("- Restart your terminal/command prompt after installing Docker")
                logger.info("- Check that the Docker daemon is running properly")
                return False
            
            # Check if Docker is available
            try:
                docker_result = subprocess.run(["docker", "--version"], capture_output=True, text=True, timeout=10)
                if docker_result.returncode != 0:
                    logger.error("Docker not found")
                    logger.info("")
                    logger.info("Troubleshooting Docker services:")
                    logger.info("- Install Docker Desktop from https://www.docker.com/products/docker-desktop")
                    logger.info("- Make sure Docker Desktop is running")
                    logger.info("- Add Docker to your PATH environment variable")
                    logger.info("- Restart your terminal/command prompt after installing Docker")
                    logger.info("- Check that the Docker daemon is running properly")
                    logger.info("- Verify that Docker has sufficient system resources allocated")
                    return False
            except Exception as e:
                logger.error(f"Error checking Docker availability: {e}")
                logger.info("")
                logger.info("Troubleshooting Docker services:")
                logger.info("- Install Docker Desktop from https://www.docker.com/products/docker-desktop")
                logger.info("- Make sure Docker Desktop is running")
                logger.info("- Add Docker to your PATH environment variable")
                logger.info("- Restart your terminal/command prompt after installing Docker")
                logger.info("- Check that the Docker daemon is running properly")
                logger.info("- Verify that Docker has sufficient system resources allocated")
                return False
            
            # Start services
            result = subprocess.run(["docker-compose", "-f", compose_file_path, "up", "--remove-orphans", "-d"], 
                                    capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                logger.info("[SUCCESS] Redis and Neo4j services started successfully")
                logger.debug(f"Docker output: {result.stdout}")
                return True
            else:
                logger.error(f"✗ Failed to start Docker services: {result.stderr}")
                logger.info("")
                logger.info("Troubleshooting Docker services:")
                logger.info("- Make sure Docker Desktop is installed and running")
                logger.info("- Check that Neo4j and Redis containers are configured in docker-compose.yml")
                logger.info("- Verify Docker has sufficient resources allocated")
                logger.info("- Try running 'docker-compose -f {} up --remove-orphans -d' manually to see detailed error messages".format(compose_file_path))
                logger.info("- Check Docker logs for more information: 'docker-compose logs'")
                logger.info("- Restart Docker Desktop and try again")
                logger.info("- Check that the Docker daemon is running properly")
                logger.info("- Verify that Docker has sufficient system resources allocated")
                logger.info("- Ensure no conflicting containers are running on the same ports")
                return False
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to start Docker services: {e}")
            logger.error(f"stdout: {e.stdout}")
            logger.error(f"stderr: {e.stderr}")
            logger.info("")
            logger.info("Troubleshooting Docker services:")
            logger.info("- Make sure Docker Desktop is installed and running")
            logger.info("- Check that Neo4j and Redis containers are configured in docker-compose.yml")
            logger.info("- Verify Docker has sufficient resources allocated")
            logger.info("- Try running 'docker-compose -f {} up --remove-orphans -d' manually to see detailed error messages".format(compose_file_path))
            logger.info("- Check Docker logs for more information: 'docker-compose logs'")
            logger.info("- Restart Docker Desktop and try again")
            logger.info("- Check that the Docker daemon is running properly")
            logger.info("- Verify that Docker has sufficient system resources allocated")
            logger.info("- Ensure no conflicting containers are running on the same ports")
            return False
        except Exception as e:
            logger.error(f"Unexpected error starting Docker services: {e}")
            logger.info("")
            logger.info("Troubleshooting Docker services:")
            logger.info("- Make sure Docker Desktop is installed and running")
            logger.info("- Check that Neo4j and Redis containers are configured in docker-compose.yml")
            logger.info("- Verify Docker has sufficient resources allocated")
            logger.info("- Try running 'docker-compose -f {} up --remove-orphans -d' manually to see detailed error messages".format(compose_file_path))
            logger.info("- Check Docker logs for more information: 'docker-compose logs'")
            logger.info("- Restart Docker Desktop and try again")
            logger.info("- Check that the Docker daemon is running properly")
            logger.info("- Verify that Docker has sufficient system resources allocated")
            logger.info("- Ensure no conflicting containers are running on the same ports")
            return False

    def start_ece_agents(self):
        """Start all ECE agents."""
        logger.info("Starting ECE agents...")
        
        try:
            # Change to ece directory
            ece_dir = Path("ece")
            if not ece_dir.exists():
                logger.error("ece directory not found")
                logger.info("")
                logger.info("Troubleshooting ECE agents:")
                logger.info("- Make sure you're running this script from the project root directory")
                logger.info("- Check that the ece directory exists in the current directory")
                logger.info("- Verify that all ECE components are properly installed")
                logger.info("- Ensure Python dependencies are installed: pip install -r requirements.txt")
                logger.info("- Check that the ECE directory structure is correct")
                logger.info("- Restart your terminal/command prompt after installing dependencies")
                return False
            
            # Start the orchestrator agent first
            orchestrator_path = ece_dir / "agents" / "tier1" / "orchestrator" / "main.py"
            if not orchestrator_path.exists():
                logger.error(f"Orchestrator agent not found: {orchestrator_path}")
                logger.info("")
                logger.info("Troubleshooting ECE agents:")
                logger.info("- Make sure the ECE directory structure is correct")
                logger.info("- Check that all ECE components are properly installed")
                logger.info("- Verify that orchestrator agent exists at ece/agents/tier1/orchestrator/main.py")
                logger.info("- Ensure Python dependencies are installed: pip install -r requirements.txt")
                logger.info("- Restart your terminal/command prompt after installing dependencies")
                logger.info("- Check that the ECE directory structure matches the expected layout")
                return False
                
            cmd = [sys.executable, str(orchestrator_path)]
            logger.info(f"Running ECE orchestrator: {' '.join(cmd)}")
            
            process = subprocess.Popen(cmd, cwd=ece_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.processes.append(("ECE orchestrator", process))
            logger.info(f"[SUCCESS] ECE orchestrator started with PID {process.pid}")
            
            # Wait for orchestrator to be ready
            orchestrator_port = os.getenv('ORCHESTRATOR_PORT', '8000')
            if not self.wait_for_service(f"http://localhost:{orchestrator_port}/health", "ECE Orchestrator"):
                logger.error("ECE Orchestrator failed to become ready within the timeout period")
                return False
            
            # Start other agents (Distiller, QLearning, Archivist, etc.)
            # For simplicity, we'll start them using the run_all_agents.py script if it exists
            run_all_script = Path("utility_scripts/run_all_agents.py")
            if run_all_script.exists():
                cmd = [sys.executable, str(run_all_script)]
                logger.info(f"Running ECE agents: {' '.join(cmd)}")
                
                process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                self.processes.append(("ECE agents", process))
                logger.info(f"[SUCCESS] ECE agents started with PID {process.pid}")
                
                # Wait for the agents to start up
                import time
                time.sleep(5)  # Wait a bit for the agents to initialize
                
                # Check if the agents are ready by testing their endpoints
                agents_ready = True
                port_checks = [
                    (os.getenv('DISTILLER_PORT', '8001'), "Distiller"),
                    (os.getenv('QLEARNING_PORT', '8002'), "QLearning"),
                    (os.getenv('ARCHIVIST_PORT', '8003'), "Archivist"),
                    (os.getenv('INJECTOR_PORT', '8004'), "Injector"),
                    (os.getenv('FILESYSTEM_PORT', '8006'), "FileSystem"),
                    (os.getenv('WEBSEARCH_PORT', '8007'), "WebSearch")
                ]
                
                for port, name in port_checks:
                    if not self.wait_for_port(f"ECE {name}", int(port), timeout=45):
                        logger.warning(f"ECE {name} on port {port} is not responding")
                        agents_ready = False
                    else:
                        logger.info(f"ECE {name} on port {port} is responding")
                
                if agents_ready:
                    logger.info("All ECE agents started and responding successfully")
                else:
                    logger.warning("Some ECE agents might not be responding yet, continuing...")
                
            else:
                logger.warning("run_all_agents.py not found, starting orchestrator only...")
                logger.info("Consider creating utility_scripts/run_all_agents.py for a complete agent setup")
                
            logger.info("[SUCCESS] ECE agents started successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error starting ECE agents: {e}")
            logger.info("")
            logger.info("Troubleshooting ECE agents:")
            logger.info("- Make sure all Python dependencies are installed: pip install -r requirements.txt")
            logger.info("- Check that the ECE directory structure is correct")
            logger.info("- Verify that Redis and Neo4j services are running")
            logger.info("- Check logs in the logs/ directory for detailed error information")
            logger.info("- Ensure Docker services are properly configured and running")
            logger.info("- Restart your terminal/command prompt after installing dependencies")
            logger.info("- Check that all required Python packages are properly installed")
            logger.info("- Verify that the ECE components are compatible with your Python version")
            return False

    def stop_all_processes(self):
        """Stop all started processes."""
        logger.info("Stopping all processes...")
        
        for name, process in self.processes:
            try:
                if process.poll() is None:  # Process is still running
                    logger.info(f"Terminating {name} (PID {process.pid})...")
                    process.terminate()
                    
                    # Wait for graceful termination
                    try:
                        process.wait(timeout=10)
                        logger.info(f"[SUCCESS] {name} terminated gracefully")
                    except subprocess.TimeoutExpired:
                        logger.warning(f"Force killing {name}...")
                        process.kill()
                        process.wait()
                        logger.info(f"[SUCCESS] {name} force killed")
            except Exception as e:
                logger.error(f"Error stopping {name}: {e}")
        
        logger.info("[INFO] All processes stopped")

    def wait_for_service(self, url, service_name, timeout=60):
        """Wait for a service to be ready by checking its health endpoint."""
        import time
        import requests
        from requests.exceptions import RequestException
        
        logger.info(f"Waiting for {service_name} to become ready at {url}...")
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    logger.info(f"[SUCCESS] {service_name} is ready at {url}")
                    return True
            except RequestException:
                pass  # Service not ready yet, continue waiting
            except Exception as e:
                logger.debug(f"Error checking {service_name} health: {e}")
            
            time.sleep(2)  # Wait 2 seconds before checking again
        
        logger.info(f"Health check failed for {service_name} at {url}, trying port availability...")
        # If health check fails, try to connect to the port directly
        return self.wait_for_port(service_name, int(url.split(':')[-1].split('/')[0]), timeout)

    def wait_for_port(self, service_name, port, timeout=60):
        """Wait for a port to become available."""
        import time
        import socket
        
        logger.info(f"Waiting for {service_name} port {port} to become available...")
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                    sock.settimeout(2)  # 2 second timeout for each connection attempt
                    result = sock.connect_ex(('localhost', port))
                    if result == 0:
                        logger.info(f"[SUCCESS] {service_name} port {port} is available")
                        return True
            except Exception as e:
                logger.debug(f"Error checking port {port}: {e}")
            
            time.sleep(2)  # Wait 2 seconds before checking again
        
        logger.warning(f"Timeout waiting for {service_name} port {port}")
        return False

    def signal_handler(self, signum, frame):
        """Handle termination signals."""
        logger.info(f"Received signal {signum}, shutting down...")
        self.running = False
        self.stop_all_processes()
        logger.info("[INFO] All processes stopped successfully")
        sys.exit(0)

    def run(self, model_path, port):
        """Run the complete ECE startup process."""
        logger.info("Simplified ECE Startup")
        logger.info("=====================")
        
        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        try:
            # 1. Start Docker services (Redis, Neo4j)
            if not self.start_docker_services():
                logger.error("Failed to start Docker services")
                logger.info("")
                logger.info("Troubleshooting Docker services:")
                logger.info("- Make sure Docker Desktop is installed and running")
                logger.info("- Check that Neo4j and Redis containers are configured in docker-compose.yml")
                logger.info("- Verify Docker has sufficient resources allocated")
                return 1
            
            # Wait a bit for services to start
            time.sleep(5)
            
            # 2. Start llama.cpp server
            if not self.start_llama_server(model_path, port):
                logger.error("Failed to start llama.cpp server")
                logger.info("")
                logger.info("Troubleshooting llama.cpp server:")
                logger.info("- Install build tools (CMake and C++ compiler) and try again")
                logger.info("- Download a pre-built llama.cpp server binary")
                logger.info("- Install llama-cpp-python: pip install llama-cpp-python")
                logger.info("- Use a different model serving approach")
                logger.info("")
                logger.info("For more information, see the documentation in README.md")
                return 1
            
            # 3. Start ECE agents
            if not self.start_ece_agents():
                logger.error("Failed to start ECE agents")
                logger.info("")
                logger.info("Troubleshooting ECE agents:")
                logger.info("- Make sure all Python dependencies are installed")
                logger.info("- Check that the ECE directory structure is correct")
                logger.info("- Verify that Redis and Neo4j services are running")
                logger.info("- Check logs in the logs/ directory for detailed error information")
                return 1
            
            logger.info("")
            logger.info("🎉 Simplified ECE System is running!")
            logger.info("===================================")
            logger.info("Services:")
            
            # Get Redis and Neo4j ports from .env or use defaults
            redis_port = os.getenv('REDIS_PORT', '6379')
            neo4j_port = os.getenv('NEO4J_PORT', '7687')
            
            logger.info(f"  - Redis: localhost:{redis_port}")
            logger.info(f"  - Neo4j: localhost:{neo4j_port}")
            logger.info(f"  - llama.cpp server: localhost:{port}")
            
            # Get ECE agent ports from environment variables
            orchestrator_port = os.getenv('ORCHESTRATOR_PORT', '8000')
            distiller_port = os.getenv('DISTILLER_PORT', '8001')
            qlearning_port = os.getenv('QLEARNING_PORT', '8002')
            archivist_port = os.getenv('ARCHIVIST_PORT', '8003')
            injector_port = os.getenv('INJECTOR_PORT', '8004')
            filesystem_port = os.getenv('FILESYSTEM_PORT', '8006')
            websearch_port = os.getenv('WEBSEARCH_PORT', '8007')
            
            logger.info(f"  - ECE Orchestrator: localhost:{orchestrator_port}")
            logger.info(f"  - ECE Distiller: localhost:{distiller_port}")
            logger.info(f"  - ECE QLearning: localhost:{qlearning_port}")
            logger.info(f"  - ECE Archivist: localhost:{archivist_port}")
            logger.info(f"  - ECE Injector: localhost:{injector_port}")
            logger.info(f"  - ECE FileSystem: localhost:{filesystem_port}")
            logger.info(f"  - ECE WebSearch: localhost:{websearch_port}")
            logger.info("")
            logger.info("🔧 Configuration for qwen-code-ece/forge-cli:")
            logger.info("   To connect qwen-code-ece/forge-cli to this ECE system, use these UTCP endpoints:")
            logger.info(f"   - UTCP_ENDPOINTS=http://localhost:{websearch_port},http://localhost:{filesystem_port}")
            logger.info("   Note: GitAgent is not available in this ECE setup")
            logger.info("")
            logger.info("Press Ctrl+C to stop all services")
            logger.info("")
            
            # Keep the script running
            while self.running:
                time.sleep(1)
                
        except KeyboardInterrupt:
            logger.info("\nReceived interrupt signal, shutting down...")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
        finally:
            self.stop_all_processes()
        
        return 0

def main():
    # Load environment variables first
    from dotenv import load_dotenv
    load_dotenv()  # Load .env file if it exists
    
    parser = argparse.ArgumentParser(description='Simplified ECE Startup Script')
    parser.add_argument('--model', 
                       default=os.getenv('LLM_LLAMA_CPP_MODEL_PATH', './models/gemma-3-4b-it-qat-abliterated.q8_0.gguf'),
                       help='Path to model file (defaults to LLM_LLAMA_CPP_MODEL_PATH env var)')
    parser.add_argument('--port', type=int, 
                       default=int(os.getenv('LLAMA_CPP_PORT', '8080')),
                       help='Port to run llama.cpp server on (defaults to LLAMA_CPP_PORT env var)')
    
    args = parser.parse_args()
    
    # Create and run the simplified startup system
    system = SimplifiedECEStartup()
    return system.run(args.model, args.port)

if __name__ == "__main__":
    sys.exit(main())