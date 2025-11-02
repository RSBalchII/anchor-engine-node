# Unified ECE Approach

## Overview

The unified approach provides a single script that starts the complete External Context Engine (ECE) system including:
1. Docker containers (Neo4j, Redis)
2. llama.cpp model server
3. All ECE agents (Orchestrator, Distiller, QLearning, Archivist, Injector, FileSystem, WebSearch)

## Key Benefits

1. **Single Command Startup**: One script to start everything
2. **Automatic Service Management**: Docker services, model server, and ECE agents start automatically
3. **Proper Logging**: All logs directed to `logs/` directory
4. **Graceful Shutdown**: All services stop cleanly with Ctrl+C
5. **Cross-Platform**: Works on Windows, Linux, and Mac
6. **Faster Startup**: Optimized with parallel service initialization
7. **Clear Connection**: Direct relationship between application and model backend

## Prerequisites

1. **Python 3.11+** installed
2. **Docker Desktop** installed and running
3. **llama.cpp** built (if not already built)
4. **Dependencies**: `pip install -r requirements.txt`

## Usage

### Start the Complete System

```bash
python start_full_ecosystem.py --model ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf --port 8080
```

### Alternative Scripts

**Windows Batch**:
```bash
start_full_ecosystem.bat ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf 8080
```

**Windows PowerShell**:
```powershell
./start_full_ecosystem.ps1 -ModelPath "./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf" -Port 8080
```

## What Gets Started

1. **Docker Services**:
   - Neo4j (port 7687)
   - Redis (port 6379)

2. **Model Server**:
   - llama.cpp server (port 8080 by default)

3. **ECE Agents**:
   - Orchestrator (port 8000)
   - Distiller (port 8001)
   - QLearning (port 8002)
   - Archivist (port 8003)
   - Injector (port 8004)
   - FileSystem (port 8006)
   - WebSearch (port 8007)

## Configuration

The main configuration is in `config.yaml`:
```yaml
llm:
  active_provider: llama_cpp
  providers:
    llama_cpp:
      model_path: ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf
      api_base: http://localhost:8080/v1
      model: ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf
```

## Model Directory

All models should be placed in the `./models/` directory:
```
models/
├── gemma-3-4b-it-qat-abliterated.q8_0.gguf
├── deepseek-r1-distill-qwen-14b-q4_k_m.gguf
└── your-custom-model.q8_0.gguf
```

## Connecting to the System

Once running, connect to:

1. **Direct Model Access**: `http://localhost:8080/v1` (OpenAI-compatible)
2. **ECE Orchestrator**: `http://localhost:8000/process_prompt`
3. **UTCP Tools**: Discovered via `http://localhost:8000/utcp`

## Stopping the System

Press Ctrl+C to stop all services gracefully.

## Troubleshooting

### Common Issues

1. **Docker Not Running**: Start Docker Desktop first
2. **Port Conflicts**: Use `netstat -ano | findstr :PORT` to check
3. **Model Not Found**: Ensure model file exists in models/ directory
4. **Service Timeout**: Check logs in `logs/` directory

### Diagnostic Commands

```bash
# Check service health
curl http://localhost:8080/health
curl http://localhost:8000/health

# Check port usage
netstat -an | findstr :8080
netstat -an | findstr :8000

# Check Docker services
docker compose ps
```

## When to Use Unified Approach

### Recommended For:
- Full ECE ecosystem with persistent memory
- Development and testing requiring complete system
- Production deployments with all ECE features
- Cases needing multi-agent coordination
- Situations requiring context management

### When to Use Alternatives:
- Simple model serving only: Use direct llama.cpp
- Minimal dependencies: Use simplified approach
- Resource-constrained environments: Consider selective startup

## Documentation

Complete documentation is available in:
- `docs/unified_startup_guide.md` - Comprehensive guide
- `docs/unified_approach.md` - Technical specifications