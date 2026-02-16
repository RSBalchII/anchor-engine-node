# Standard 088: Server Startup Sequence for Engine-Wrapper Communication

## Problem Statement
The Electron wrapper was experiencing ECONNREFUSED errors when attempting to connect to the engine server, preventing UI access. The root cause was improper startup sequencing where database initialization blocked server startup.

## Solution Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│  OLD SEQUENCE (FAILED)                                         │
├─────────────────────────────────────────────────────────────────┤
│  1. await db.init() ← BLOCKING                                │
│  2. app.listen() ← DELAYED                                    │
│  3. Electron wrapper timeout ← ECONNREFUSED                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  NEW SEQUENCE (SUCCESSFUL)                                     │
├─────────────────────────────────────────────────────────────────┤
│  1. app.listen() ← IMMEDIATE                                  │
│  2. await db.init() ← BACKGROUND                              │
│  3. Electron wrapper connects ← SUCCESS                       │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Requirements
1. **Server First**: Start HTTP server before database initialization
2. **State Tracking**: Implement `db.isInitialized` property for readiness checks
3. **Graceful Health Checks**: Health endpoints handle uninitialized state
4. **Extended Timeouts**: Increase Electron wrapper health check timeouts

## Code Changes Required

### Engine Startup (`engine/src/index.ts`)
```typescript
// BEFORE: Database first
await db.init();
app.listen(config.PORT, () => { ... });

// AFTER: Server first
app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});
await db.init(); // Background initialization
```

### Database Class (`engine/src/core/db.ts`)
```typescript
// Add initialization state tracking
private _isInitialized: boolean = false;
get isInitialized(): boolean {
  return this._isInitialized;
}

// Set flag after initialization completes
async init(): Promise<void> {
  // ... initialization code ...
  this._isInitialized = true; // Mark as initialized
}
```

### Health Check Service (`engine/src/services/health-check.ts`)
```typescript
// Handle uninitialized state gracefully
private async checkDatabaseHealth(): Promise<ComponentHealth> {
  if (!db.isInitialized) {
    return {
      name: 'database',
      status: 'degraded', // Not unhealthy, just not ready
      message: 'Database not yet initialized',
      details: { initialized: false }
    };
  }
  // ... normal health check logic
}
```

### Electron Wrapper (`desktop-overlay/src/main.ts`)
```typescript
// Increase timeout values
const req = http.get(`${FRONTEND_URL}/health`, (res) => {
  // ... response handling
});
// Timeout increased from 3000ms to 10000ms
setTimeout(() => { ... }, 10000);
```

### Configuration Management (`engine/src/config/index.ts`)
```typescript
// Centralized configuration management
interface Config {
  PORT: number; // Configurable port (default: 3160)
  HOST: string; // Configurable host (default: '127.0.0.1')
  // ... other configuration options
}

// Load from user_settings.json with defaults
const DEFAULT_CONFIG: Config = {
  PORT: 3160, // Default port (configurable in user_settings.json)
  HOST: '127.0.0.1', // Default host
  // ... other defaults
};
```

## Testing Requirements
- Verify server starts and binds to port before database initialization
- Confirm health endpoint returns appropriate status during initialization phases
- Test Electron wrapper successfully connects after server is ready
- Validate UI accessibility via direct browser access

## Error Prevention
This standard prevents ECONNREFUSED errors by ensuring the HTTP server is available to accept connections before dependent services attempt to connect to it. The database initialization occurs in the background without blocking server availability.

## Authority
This standard supersedes any previous startup sequence implementations and must be followed for all engine-wrapper communication patterns.