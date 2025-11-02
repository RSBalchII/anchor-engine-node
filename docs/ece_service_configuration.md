# ECE Service Configuration for qwen-code-ece and forge-cli

This document explains how to properly configure qwen-code-ece and forge-cli to connect to the External Context Engine (ECE) services.

## ECE Service Endpoints

When the ECE system is running, it provides the following services on these ports:

| Service | Port | Endpoint | Description |
|---------|------|----------|-------------|
| ECE Orchestrator | 8000 | http://localhost:8000 | Main orchestrator service |
| ECE Distiller | 8001 | http://localhost:8001 | Text processing and entity extraction |
| ECE QLearning | 8002 | http://localhost:8002 | Knowledge graph navigation |
| ECE Archivist | 8003 | http://localhost:8003 | Context management and retrieval |
| ECE Injector | 8004 | http://localhost:8004 | Data injection into Neo4j |
| ECE FileSystem | 8006 | http://localhost:8006 | File system operations |
| ECE WebSearch | 8007 | http://localhost:8007 | Web search capabilities |
| ECE Git | 8009 | http://localhost:8009 | Git operations |

## Configuration for qwen-code-ece

To configure qwen-code-ece to connect to the ECE services, you need to set the UTCP_ENDPOINTS environment variable or update the configuration:

### Method 1: Environment Variable

Set the UTCP_ENDPOINTS environment variable:

```bash
export UTCP_ENDPOINTS=http://localhost:8007,http://localhost:8006,http://localhost:8009
```

On Windows:
```cmd
set UTCP_ENDPOINTS=http://localhost:8007,http://localhost:8006,http://localhost:8009
```

### Method 2: .env File

Create or update the .env file in the qwen-code-ece project root:

```env
UTCP_ENDPOINTS=http://localhost:8007,http://localhost:8006,http://localhost:8009
```

### Method 3: config.py Update

Update the config.py file in qwen-code-ece to use the correct endpoints:

```python
# In config.py, update the default UTCP endpoints:
if self.utcp_endpoints is None:
    utcp_endpoints_str = os.getenv("UTCP_ENDPOINTS", "http://localhost:8007,http://localhost:8006,http://localhost:8009")
    self.utcp_endpoints = [endpoint.strip() for endpoint in utcp_endpoints_str.split(",")]
```

## Configuration for forge-cli

The forge-cli should automatically discover the UTCP services when they are running. However, you can also explicitly configure the endpoints:

### Method 1: Environment Variable

Set the UTCP_SERVICE_ENDPOINTS environment variable:

```bash
export UTCP_SERVICE_ENDPOINTS=http://localhost:8007,http://localhost:8006,http://localhost:8009
```

On Windows:
```cmd
set UTCP_SERVICE_ENDPOINTS=http://localhost:8007,http://localhost:8006,http://localhost:8009
```

### Method 2: Command Line Argument

When running forge-cli, you can specify the endpoints:

```bash
forge-cli --utcp-endpoints http://localhost:8007,http://localhost:8006,http://localhost:8009
```

## Testing the Connection

You can test if all services are running and accessible by running the test script:

```bash
python test_ece_services.py
```

## Troubleshooting

### 1. Service Not Responding

If a service is not responding:
1. Check that the ECE system is fully started (wait for all services to initialize)
2. Verify the service is running on the expected port
3. Check firewall settings that might block the connection
4. Look at the ECE logs in the `logs/` directory for error messages

### 2. Port Conflicts

If you see port conflicts:
1. Stop any processes using the required ports
2. Change the port configuration in the .env file
3. Restart the ECE system

### 3. Connection Timeout

If you're getting connection timeouts:
1. Ensure all Docker services (Redis, Neo4j) are running
2. Wait longer for services to initialize (some services take time to start)
3. Check system resources (memory, CPU) to ensure they're sufficient

## Service Health Check Endpoints

Each ECE service provides health check endpoints:

- `/health` - Basic health check
- `/utcp` - UTCP manual for tool discovery

You can check if a service is running by accessing:
```
http://localhost:<PORT>/health
```

For example:
```
http://localhost:8000/health  # ECE Orchestrator
http://localhost:8006/health  # ECE FileSystem
http://localhost:8007/health  # ECE WebSearch
http://localhost:8009/health  # ECE Git
```