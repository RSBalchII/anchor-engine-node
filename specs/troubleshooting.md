````markdown
# Troubleshooting


This file consolidates troubleshooting steps for Anchor and replicates the content from the root-level `TROUBLESHOOTING.md` and `FIX_TOOL_USAGE.md`.

## Connection Issues

### "Cannot connect to ECE_Core"

**Symptoms**:
- Error message: `Cannot connect to ECE_Core at http://localhost:8000`
- Anchor exits immediately after starting

**Solutions**:

1. **Verify ECE_Core is running**:
	```bash
	cd C:\Users\rsbiiw\Projects\ECE_Core
	python launcher.py
	# Wait for: "🎯 ECE_Core running at http://127.0.0.1:8000"
	```

2. **Check ECE_Core health**:
	```bash
	curl http://localhost:8000/health
	# Should return: {"status": "healthy", ...}
	```

3. **Verify .env configuration**:
	```bash
	# Check anchor/.env has correct URL
	ECE_URL=http://localhost:8000
	```

4. **Check firewall** (Windows):
	- Allow Python through Windows Firewall
	- Check if antivirus is blocking port 8000

5. **Check port conflicts**:
	```bash
	# Windows
	netstat -ano | findstr :8000
   
	# If port in use, kill process or change ECE_Core port
	```

---

## Tool Calling Issues

### "Tool calls not working" or "Malformed tool calls"

**Symptoms**:
- LLM tries to use tools but fails
- Tool calls are garbled or incomplete
- Tools execute but return errors

**Root Cause**: **Model size is too small (<14B parameters)**

**Solutions**:

1. **Use a larger model** (BEST):
	- Recommended: 14B+ parameter models (e.g., Qwen2.5-14B-Instruct)
	- Small models (7B, 3B) are **unreliable** for MCP tool calls

2. **Enable tool confirmation** (.env):
	```bash
	TOOL_CONFIRMATION_REQUIRED=true
	```
	This lets you review tool calls before execution.

3. **Check MCP server is running**:
	- Should start automatically with Anchor
	- Check logs for "✓ MCP server started (port 8008)"
   
4. **Manually verify MCP server**:
	```bash
	# Check if port 8008 is listening
	netstat -ano | findstr :8008
   
	# Test MCP health (if implemented)
	curl http://localhost:8008/health
	```

5. **Restart Anchor** (restarts MCP server):
	- Exit Anchor (Ctrl+C)
	- Start again: `python main.py`

---

## Memory Issues

### "Responses seem generic" or "No memory context"

**Symptoms**:
- LLM doesn't remember past conversations
- Responses lack context
- No memory retrieval mentioned

**Solutions**:

1. **Verify ECE_Core has memories**:
	```bash
	curl http://localhost:8000/health
	# Check "memories_count" field
	```

2. **Check memory backends** (Redis + Neo4j):
   
	**Redis** (optional, for caching):
	```bash
	# Install Redis
	# Windows: https://github.com/microsoftarchive/redis/releases
	# Run: redis-server
   
	# Verify connection
	redis-cli ping
	# Should return: PONG
	```
   
	**Neo4j** (required for graph memory):
	```bash
	# Install Neo4j Desktop: https://neo4j.com/download/
	# Create database with credentials in ECE_Core/.env
	# Start database from Neo4j Desktop
	```

3. **Check ECE_Core logs**:
	- Look for memory retrieval errors
	- Check database connection status

4. **Session ID mismatch**:
	- Ensure `SESSION_ID` in anchor/.env matches ECE_Core session
	- Default: "anchor-session"

---

## MCP Server Issues

### "MCP server won't start" or "Tool calling disabled"

**Symptoms**:
- Warning: "MCP server not found"
- Warning: "Tool calling will be disabled"
- Tools unavailable during conversation

**Solutions**:

1. **Verify mcp/server.py exists**:
	```bash
	ls anchor/mcp/server.py
	# Should exist
	```

2. **Check port 8008 is available**:
	```bash
	netstat -ano | findstr :8008
	# Should be empty or only show Anchor's MCP server
	```

3. **Check Python path**:
	- Ensure Python can be found on PATH
	- Try: `python --version`

4. **Manual MCP server start** (debugging):
	```bash
	cd anchor/mcp
	python server.py
	# Should start without errors
	```

5. **Check MCP dependencies**:
	```bash
	cd anchor/mcp
	pip install -r requirements.txt
	```

---

## Redis Issues

### "Redis unavailable" warning

**Symptoms**:
- Warning message about Redis connection
- System still works but may be slower

**Is this OK?** **YES!** Anchor uses graceful degradation:
- **Redis is OPTIONAL** (used for caching)
- System works fine with just Neo4j
- You'll only miss performance benefits

**To enable Redis** (optional):

1. **Install Redis**:
	- Windows: https://github.com/microsoftarchive/redis/releases
	- Linux: `sudo apt-get install redis-server`
	- Mac: `brew install redis`

2. **Start Redis**:
	```bash
	redis-server
	# Default port: 6379
	```

3. **Verify**:
	```bash
	redis-cli ping
	# Should return: PONG
	```

4. **Configure ECE_Core** (.env):
	```bash
	REDIS_URL=redis://localhost:6379
	```

---

## Neo4j Issues

### "Neo4j unavailable" error

**Symptoms**:
- Error about Neo4j connection
- Memory features disabled

**Is this OK?** **NO!** Neo4j is required for memory features.

**Solutions**:

1. **Install Neo4j Desktop**:
	- Download: https://neo4j.com/download/
	- Install and create a new database

2. **Configure credentials** (ECE_Core/.env):
	```bash
	NEO4J_URL=bolt://localhost:7687
	NEO4J_USER=neo4j
	NEO4J_PASSWORD=your_password_here
	```

3. **Start Neo4j database**:
	- Open Neo4j Desktop
	- Start your database
	- Verify it's running (green status)

4. **Verify connection**:
	```bash
	# From Neo4j Desktop, open browser
	# Or visit: http://localhost:7474
	```

5. **Build knowledge graph**:
	```bash
	cd C:\Users\rsbiiw\Projects\ECE_Core
	python build_knowledge_graph.py
	```

---

## Performance Issues

### Slow responses or high memory usage

**Symptoms**:
- Responses take >10 seconds
- RAM usage >8GB
- System becomes unresponsive

**Solutions**:

1. **Check model size**:
	- Large models (30B+) need 16GB+ RAM
	- Use smaller models (7B-14B) for 8GB systems

2. **Check llama.cpp configuration**:
	```bash
	# Reduce context size
	# Edit llama.cpp startup parameters
	--ctx-size 4096  # Instead of 8192 or higher
	```

3. **Close other applications**:
	- Free up RAM before running Anchor
	- Check Task Manager for memory hogs

4. **Check disk space**:
	- Models need 5-20GB each
	- Neo4j database grows over time
	- Free up disk space if low

5. **Monitor resource usage**:
	- RAM: Task Manager > Performance > Memory
	- Disk: Task Manager > Performance > Disk
	- CPU: Should be high during inference (normal)

---

## Installation Issues

### "Module not found" errors

**Symptoms**:
- `ModuleNotFoundError: No module named 'httpx'`
- Import errors on startup

**Solutions**:

1. **Install dependencies**:
	```bash
	cd C:\Users\rsbiiw\Projects\anchor
	pip install -r requirements.txt
	```

2. **Use virtual environment** (recommended):
	```bash
	python -m venv .venv
	.venv\Scripts\activate  # Windows
	pip install -r requirements.txt
	```

3. **Check Python version**:
	```bash
	python --version
	# Should be 3.10 or higher
	```

---

## Security Warnings

### "shell_execute is dangerous" 

**This is a FEATURE, not a bug.**

**Why the warning?**
- `shell_execute` tool can run **arbitrary commands**
- Small models may generate unsafe commands
- No sandboxing in v0.1.0

**What to do?**

1. **Use only in trusted environments**:
	- **Never** expose ECE_Core to public networks
	- **Never** use with untrusted users

2. **Enable confirmation mode** (.env):
	```bash
	TOOL_CONFIRMATION_REQUIRED=true
	```

3. **Review commands before execution**:
	- Check what the LLM wants to run
	- Decline if suspicious

4. **Use larger models**:
	- 14B+ models generate safer tool calls

5. **Wait for sandboxing** (future):
	- T-101: Tool sandboxing (planned)
	- Will restrict dangerous operations

---

## Logging & Debugging

### Enable debug logging

**In main.py**, change:
```python
logging.basicConfig(level=logging.DEBUG)  # Instead of WARNING
```

**Or use /debug command**:
```
You: /debug
Debug logging: ON
```

### Check logs location

Logs are printed to console (stdout/stderr):
- Redirect to file: `python main.py 2>&1 | tee anchor.log`
- Check ECE_Core logs separately

---

## Still Having Issues?

1. **Check project documentation**:
	- README.md - Quick start
	- specs/spec.md - Technical architecture
	- specs/tasks.md - Known issues

2. **Verify all services**:
	```bash
	# ECE_Core
	curl http://localhost:8000/health
   
	# MCP Server (if running)
	netstat -ano | findstr :8008
   
	# Redis (optional)
	redis-cli ping
   
	# Neo4j (required)
	# Check Neo4j Desktop status
	```

3. **File an issue**:
	- Include error messages
	- Include logs
	- Include system info (OS, RAM, Python version)

---

**Last Updated**: 2025-11-14  
**Version**: v0.1.0-alpha


````
