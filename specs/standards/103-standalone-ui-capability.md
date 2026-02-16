# Standard 103: Standalone UI Capability (Internal Lightweight UI for Independent Operation)

**Status:** Active | **Authority:** Human-Locked | **Domain:** Architecture

## Problem Statement

The Anchor Engine needs to operate independently as a standalone search tool while maintaining seamless integration with the full system. Previously, the engine relied solely on the external UI from `packages/anchor-ui/dist`, making standalone operation impossible without the full system.

## Solution

Implement a dual UI serving mechanism that:
1. Serves an internal lightweight UI when running standalone
2. Uses the external UI when integrated with the full system
3. Automatically detects which UI to serve based on availability

## Implementation Requirements

### 1. UI Detection Logic
- Check for existence of external UI at `../../../packages/anchor-ui/dist`
- If exists, serve external UI
- If not exists, serve internal lightweight UI from `../public`

### 2. Internal Lightweight UI
- Minimal React-based interface
- Core functionality: search, health checks, backup operations
- Responsive design for various screen sizes
- Consistent styling with the main UI

### 3. Route Handling
- Static asset serving from appropriate directory
- Catch-all route for SPA routing
- Proper fallback handling

### 4. Configuration Management
- No additional configuration required
- Automatic detection and serving
- Maintains all existing functionality

## Code Implementation

### Engine Startup (`engine/src/index.ts`)
```typescript
// Try to serve the external UI first (when running in full system)
const externalFrontendDist = path.join(__dirname, "../../../packages/anchor-ui/dist");
const internalFrontendDist = path.join(__dirname, "../public");

// Check if external UI exists, otherwise use internal lightweight UI
if (require('fs').existsSync(externalFrontendDist)) {
  console.log("Using external UI from packages/anchor-ui/dist");
  app.use(express.static(externalFrontendDist));
} else {
  console.log("Using internal lightweight UI from engine/public");
  app.use(express.static(internalFrontendDist));
}
```

### Catch-all Route
```typescript
// Determine which UI to serve based on availability
const externalFrontendDist = path.join(__dirname, "../../../packages/anchor-ui/dist");
const internalFrontendDist = path.join(__dirname, "../public");

if (require('fs').existsSync(externalFrontendDist)) {
  // Serve external UI
  app.get("*", (req, res) => {
    if (req.path.startsWith("/v1") || req.path.startsWith("/health")) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.sendFile(path.join(externalFrontendDist, "index.html"));
  });
} else {
  // Serve internal lightweight UI
  app.get("*", (req, res) => {
    if (req.path.startsWith("/v1") || req.path.startsWith("/health")) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.sendFile(path.join(internalFrontendDist, "index.html"));
  });
}
```

## Benefits

### 1. Standalone Operation
- Engine can run independently without full system
- Suitable for search engine applications
- Usable by other chat agent tools

### 2. Seamless Integration
- No changes required when integrated with full system
- Automatic detection of UI availability
- Maintains all existing functionality

### 3. Reduced Dependencies
- No hard dependency on external UI package
- Flexible deployment options
- Easier testing and development

## Testing Requirements

### 1. Standalone Mode
- Verify internal UI serves when external UI not present
- Test all UI functionality in standalone mode
- Confirm API endpoints work correctly

### 2. Integrated Mode
- Verify external UI serves when available
- Test all UI functionality with external UI
- Confirm seamless transition between modes

### 3. Edge Cases
- Handle missing UI files gracefully
- Test route handling for API vs UI requests
- Verify error handling for file system operations

## Deployment Considerations

### 1. Distribution
- Internal UI bundled with engine
- No additional dependencies for standalone operation
- External UI still available for full system

### 2. Maintenance
- Both UI versions maintained appropriately
- Consistent API contract between UIs
- Clear documentation of differences

## Security Implications

### 1. Attack Surface
- Same API endpoints available in both modes
- Updated to use port 3160 instead of 3000 for Windows app permissions compatibility
- No additional security risks introduced
- Existing security measures remain in place

### 2. Access Control
- Same authentication/authorization patterns
- No changes to existing security model
- Consistent security posture across modes

## Performance Impact

### 1. Resource Usage
- Minimal overhead for UI detection logic
- Same API performance characteristics
- Light internal UI reduces resource requirements

### 2. Startup Time
- Negligible impact on startup time
- File system check is fast
- No blocking operations introduced

## Rollback Plan

If issues arise:
1. Remove UI detection logic
2. Revert to external UI only
3. Maintain existing functionality

## Compliance Verification

This standard ensures:
- [x] Standalone operation capability
- [x] Seamless integration with full system
- [x] Automatic UI selection
- [x] Consistent functionality across modes
- [x] No breaking changes to existing systems
- [x] Proper error handling and fallbacks