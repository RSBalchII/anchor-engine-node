# Anchor - Troubleshooting

This file is the canonical troubleshooting guide for Anchor and provides operational steps
and diagnostic commands to resolve common problems encountered when running Anchor with
ECE_Core and optional components (Redis and Neo4j).

## Cannot connect to ECE_Core

Symptoms:
- Anchor fails to start or immediately prints an error about a missing ECE_Core backend.

Fixes:
- Ensure ECE_Core is running locally: `cd ../ECE_Core && python launcher.py`
- Verify ECE_Core health: `curl http://localhost:8000/health` and confirm the status is `healthy`.
- If you see `Connection refused` or `ECONNREFUSED`, check that port 8000 is not used by another service.

## Tool calls not working

Symptoms:
- LLM emits malformed tool calls, or tool calls are not recognized by Anchor.

Fixes:
- Model size matters: small LLMs (3B/4B) are less reliable for direct LLM-based tool calls; prefer 14B+ models or use Simple Tool Mode.
- Check the MCP server is running (if using tool execution): `cd mcp && python server.py`.
- Enable `TOOL_CONFIRMATION_REQUIRED=true` in `.env` to review tool calls before execution.

## Redis unavailable

Symptoms:
- Anchor logs indicate Redis connection failed and gracefully falls back to SQLite.

Notes:
- This is *not* fatal. Anchor will run with just SQLite, but performance will be slower.
- To enable Redis: install and start Redis, then set `REDIS_URL` in `.env`.

Commands:
```
# Start Redis (Windows example):
redis-server

# Verify Redis:
redis-cli ping  # Should return PONG
```

## Neo4j Issues

Symptoms:
- Anchor reports an inability to connect to Neo4j or association queries fail.

Fixes:
- Verify Neo4j Desktop or server is running and the database is up.
- Make sure the credentials in `.env` are correct and Neo4j URL uses the correct port.

## MCP Server Issues

Symptoms:
- MCP server cannot start, or port 8008 is already used.

Fixes:
- Confirm `anchor/mcp/server.py` exists and start it manually if needed: `cd anchor/mcp && python server.py`.
- Check if port 8008 is in use: `netstat -ano | findstr :8008` and terminate the process if needed.

## Tool execution notes

- Shell execution is dangerous; Anchor uses whitelisting. Check `.env.example` and `tool_safety.py` to configure allowed commands.
- If you see a tool call that looks suspicious, enable `TOOL_CONFIRMATION_REQUIRED=true` to require user confirmation for dangerous calls.

## Running checks and tests

Commands to run locally:
```
pytest tests/test_health.py::test_troubleshooting_guide_exists -q

# Run the entire test suite (long):
pytest -q
```

## Additional Support

If the above steps don't resolve your issue, please:
1. Double-check logs for `main.py` and `anchor/mcp`.
2. Confirm all environment variables in `.env` and `.env.example` match your deployment.
3. Open an issue with reproduction steps and logs.
