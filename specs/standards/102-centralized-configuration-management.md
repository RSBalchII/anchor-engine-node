# Standard 102: Centralized Configuration Management

**Category:** Configuration / Operations  
**Status:** Active  
**Date:** 2026-02-09

## 1. Problem Statement
The system had multiple hardcoded configuration values scattered across the codebase, making it difficult to customize deployments and maintain consistent settings. Different components used different configuration approaches, leading to inconsistencies and deployment challenges.

## 2. Solution Architecture
Implement a centralized configuration system using a single `user_settings.json` file as the source of truth for all configurable values.

```
┌─────────────────────────────────────────────────────────────────┐
│  CENTRALIZED CONFIGURATION ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│  user_settings.json ──────┐                                     │
│                           ▼                                     │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Engine Config  │  │  Frontend    │  │  Desktop        │   │
│  │  (config.ts)    │  │  (dynamic)   │  │  Overlay       │   │
│  │                 │  │              │  │  (main.ts)      │   │
│  │ • PORT          │  │ • Server URL │  │ • Server URL   │   │
│  │ • HOST          │  │ • Features   │  │ • Features     │   │
│  │ • LLM Settings  │  │ • UI Config  │  │ • UI Config    │   │
│  │ • Search Params │  │              │  │                │   │
│  └─────────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Implementation Requirements

### 3.1 Central Configuration File
- **Location**: `user_settings.json` in root directory
- **Format**: JSON with organized sections
- **Structure**:
```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 3160
  },
  "llm": {
    "provider": "remote",
    "remote_url": "http://100.74.174.76:8000/v1",
    "chat_model": "GLM-4.7-Flash.i1-Q4_K_S.gguf",
    "gpu_layers": 1,
    "ctx_size": 8192
  },
  "search": {
    "strategy": "hybrid",
    "max_chars_default": 524288,
    "max_chars_limit": 20000
  },
  "resource_management": {
    "gc_cooldown_ms": 30000,
    "max_atoms_in_memory": 10000,
    "monitoring_interval_ms": 30000
  }
}
```

### 3.2 Configuration Loading
- **Engine**: Load via `config/index.ts` module
- **Frontend**: Fetch via `/v1/config` API endpoint
- **Desktop Overlay**: Load at startup from file system

### 3.3 Runtime Configuration Endpoint
```typescript
// Engine API Route: /v1/config
app.get('/v1/config', async (_req: Request, res: Response) => {
  const serverConfig = {
    port: config.PORT,
    host: config.HOST,
    server_url: `http://${config.HOST}:${config.PORT}`,
    llm_provider: config.LLM_PROVIDER,
    search_strategy: config.SEARCH.strategy,
    features: config.FEATURES
  };
  res.status(200).json(serverConfig);
});
```

## 4. Configuration Sections

### 4.1 Server Configuration
- `server.host`: Network interface to bind to
- `server.port`: Port number for HTTP server
- `server.api_key`: Authentication key for protected endpoints

### 4.2 LLM Configuration
- `llm.provider`: 'local' or 'remote'
- `llm.remote_url`: URL for remote LLM service
- `llm.chat_model`: Path to local chat model
- `llm.ctx_size`: Context size for model
- `llm.gpu_layers`: Number of layers to offload to GPU

### 4.3 Search Configuration
- `search.strategy`: Search algorithm ('hybrid', 'vector', 'keyword')
- `search.max_chars_default`: Default character limit for search
- `search.max_chars_limit`: Maximum character limit for search

### 4.4 Resource Management
- `resource_management.gc_cooldown_ms`: Garbage collection cooldown period
- `resource_management.max_atoms_in_memory`: Maximum atoms to keep in memory
- `resource_management.monitoring_interval_ms`: Resource monitoring interval

## 5. Backward Compatibility
- Maintain default values for all configurations
- Graceful fallback to defaults if user_settings.json is missing or malformed
- Preserve existing functionality when configurations are not specified

## 6. Testing Requirements
- Verify all hardcoded values are replaced with configuration references
- Test configuration loading from user_settings.json
- Validate API endpoint returns correct configuration values
- Confirm UI components receive and use dynamic configuration
- Test fallback behavior when configuration is invalid

## 7. Deployment Considerations
- Document all configurable values in user documentation
- Provide example user_settings.json files for common configurations
- Implement configuration validation to prevent runtime errors
- Support environment-specific configurations

## 8. Authority
This standard governs all configuration management in the system. All new configurable values must be added to the centralized configuration system rather than being hardcoded in source code.