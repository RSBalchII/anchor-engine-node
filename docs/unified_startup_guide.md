# Unified ECE Startup Guide

This guide explains how to use the unified approach to start the complete External Context Engine (ECE) system with a single command.

## Overview

The unified approach provides a single script that starts the complete ECE ecosystem including:
1. Docker containers (Neo4j, Redis)
2. llama.cpp model server
3. All ECE agents (Orchestrator, Distiller, QLearning, Archivist, Injector, FileSystem, WebSearch)

## Prerequisites

1. **Python 3.11+** installed
2. **Docker Desktop** installed and running
3. **llama.cpp** built (if not already built)
4. **Required Dependencies** installed:
   ```bash
   pip install -r requirements.txt
   ```

### Installing Docker Desktop

1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Install with default settings
3. Start Docker Desktop and ensure it's running

### Building llama.cpp

#### Windows
1. Open Visual Studio Developer Command Prompt
2. Navigate to the llama.cpp directory:
   ```cmd
   cd llama.cpp
   ```
3. Create build directory and configure:
   ```cmd
   mkdir build && cd build
   cmake .. -G "Visual Studio 17 2022"
   ```
4. Build:
   ```cmd
   cmake --build . --config Release
   ```

#### Linux/Mac
```bash
cd llama.cpp
make server
```

## Usage

### Start the Complete Unified System

To start the complete ECE system with all services:
```bash
python start_full_ecosystem.py --model ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf --port 8080
```

### Alternative startup scripts

#### Windows Batch
```bash
start_full_ecosystem.bat ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf 8080
```

#### Windows PowerShell
```powershell
./start_full_ecosystem.ps1 -ModelPath "./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf" -Port 8080
```

## Command Line Options

### `--model PATH`
Specify the model file to use (default: ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf)

Example:
```bash
python start_full_ecosystem.py --model ./models/deepseek-r1-distill-qwen-14b-q4_k_m.gguf
```

### `--port PORT`
Specify the port for the llama.cpp server (default: 8080)

Example:
```bash
python start_full_ecosystem.py --port 8091
```

## What Happens During Startup

1. **Docker Services Check**: 
   - Checks if Docker is installed and running
   - Verifies Neo4j and Redis containers are available
   - Starts containers if they're not running

2. **llama.cpp Server Startup**:
   - Finds or builds llama.cpp server executable
   - Starts the server with the specified model on the specified port
   - Waits for server to become responsive

3. **ECE Agent Startup**:
   - Starts all ECE agents in the correct order
   - Waits for each agent to become responsive
   - Verifies proper communication between agents

4. **Service Monitoring**:
   - Monitors all services for proper operation
   - Provides real-time feedback on startup progress
   - Handles graceful shutdown when interrupted

## Services Started

The unified startup script starts the following services:

### Docker Services
- **Neo4j**: Knowledge graph database on port 7687
- **Redis**: Context cache on port 6379

### Model Services
- **llama.cpp Server**: Model inference on port 8080 (or specified port)

### ECE Agents
- **Orchestrator**: Central coordinator on port 8000
- **Distiller**: Text processing on port 8001
- **QLearning**: Path finding on port 8002
- **Archivist**: Knowledge graph management on port 8003
- **Injector**: Knowledge graph optimization on port 8004
- **FileSystem**: File operations on port 8006
- **WebSearch**: Web search operations on port 8007

## Logging

All services log to the `logs/` directory:

- `logs/debug_log_ecosystem.txt` - ECE ecosystem logs
- `logs/debug_log_model_inference.txt` - Model inference logs
- `logs/debug_log_orchestrator.txt` - Orchestrator logs
- `logs/debug_log_unified_startup.txt` - Unified startup logs

## Troubleshooting

### Common Issues

1. **Docker Not Found**:
   - Ensure Docker Desktop is installed and running
   - Check that Docker is in your PATH

2. **llama.cpp Server Not Starting**:
   - Ensure llama.cpp is built properly
   - Check that the model file exists
   - Verify the port is not already in use

3. **ECE Agents Not Starting**:
   - Check logs in `logs/` directory for specific errors
   - Ensure Docker services are running properly
   - Verify the model server is responsive

4. **Port Conflicts**:
   - Use `netstat -ano | findstr :PORT` to check for processes using ports
   - Kill conflicting processes or use different ports

### Diagnostic Commands

```bash
# Check if Docker is running
docker --version

# Check if Docker Compose is available
docker compose version

# Check if required containers are running
docker compose ps

# Check if services are listening on ports
netstat -an | findstr :8080
netstat -an | findstr :8000
netstat -an | findstr :6379
netstat -an | findstr :7687

# Check service health
curl http://localhost:8080/health
curl http://localhost:8000/health
curl http://localhost:6379/health
curl http://localhost:7687/health
```

## Benefits of Unified Approach

1. **Simplified Startup**: Single command to start the complete system
2. **Automatic Service Management**: Docker services, model server, and ECE agents start automatically
3. **Proper Logging**: All logs directed to `logs/` directory for easy monitoring
4. **Graceful Shutdown**: All services stop cleanly with Ctrl+C
5. **Cross-Platform Compatibility**: Works on Windows, Linux, and Mac
6. **Faster Startup Times**: Optimized startup with parallel service initialization
7. **Clearer Connection**: Direct relationship between application and model backend

## When to Use the Unified Approach

### Recommended For:
- Users who need the full ECE ecosystem functionality
- Development and testing environments requiring complete system
- Production deployments where all ECE features are needed
- Cases where persistent memory and context management are required
- Situations requiring multi-agent coordination and tool usage

### When to Use Alternatives:
- Simple model serving without ECE features: Use the direct llama.cpp approach
- Development with minimal dependencies: Use the simplified approach
- Resource-constrained environments: Consider selective agent startup

## Configuration

The unified approach uses the standard ECE configuration in `config.yaml`:

```yaml
llm:
  active_provider: llama_cpp
  providers:
    llama_cpp:
      model_path: ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf
      api_base: http://localhost:8080/v1
      model: ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf
cache:
  redis_url: redis://localhost:6379
system:
  resources:
    memory_limit_mb: 2048
ThinkerAgent:
  model: ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf
  synthesis_model: ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf
  synthesis_max_tokens: 8192
  timeout: 180
```

## Model Directory

All models should be placed in the `./models/` directory. The server will automatically detect any `.gguf` files in this directory.

Example structure:
```
models/
├── gemma-3-4b-it-qat-abliterated.q8_0.gguf
├── deepseek-r1-distill-qwen-14b-q4_k_m.gguf
└── your-custom-model.q8_0.gguf
```

## Connecting to the System

Once the unified system is running, you can connect to it in several ways:

### Direct Model Access
```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma-3-4b-it-qat-abliterated.q8_0.gguf",
    "messages": [{"role": "user", "content": "Hello!"}],
    "temperature": 0.7
  }'
```

### ECE Orchestrator Access
```bash
curl http://localhost:8000/process_prompt \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello!",
    "temperature": 0.7
  }'
```

### UTCP Tool Discovery
```bash
curl http://localhost:8000/utcp
```

## Stopping the System

Press Ctrl+C in the terminal where the script is running to stop all services gracefully. The script will:

1. Terminate the llama.cpp server
2. Stop all ECE agents
3. Shut down Docker containers
4. Clean up any temporary files

## Advanced Usage

### Custom Model Selection
To start with a different model:
```bash
python start_full_ecosystem.py --model ./models/deepseek-r1-distill-qwen-14b-q4_k_m.gguf --port 8091
```

### Port Configuration
To use a different port for the model server:
```bash
python start_full_ecosystem.py --port 8091
```

### Environment Variables
The script respects the following environment variables:
- `NEO4J_USER` - Neo4j username (default: neo4j)
- `NEO4J_PASSWORD` - Neo4j password (default: ECE_secure_password_2025)
- `REDIS_URL` - Redis connection URL (default: redis://localhost:6379)

## Future Enhancements

Potential future enhancements for the unified approach include:
1. Support for model reloading without restarting the server
2. Web-based model management interface
3. Model performance monitoring and metrics
4. Automatic model optimization based on hardware capabilities
5. Integration with model conversion tools for different quantizations

## Conclusion

The unified approach provides a complete, single-command solution for starting the full ECE ecosystem with all required services. It simplifies the complex multi-step startup process while maintaining all the functionality of the complete system.