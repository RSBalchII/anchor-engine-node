# Standard 014: GPU Resource Availability Management

## What Happened?
The system was returning 503 (Service Unavailable) errors for `/v1/memory/search` and other endpoints when GPU resources were busy or locked by another process. Users encountered errors like "Ghost Engine Disconnected" even when the Ghost Engine was running but GPU resources were temporarily unavailable.

## The Cost
- 2+ hours spent troubleshooting "disconnected" errors that were actually GPU resource contention issues
- Misleading error messages suggesting connection problems when the real issue was resource availability
- Poor user experience with hard failures instead of graceful queuing
- Multiple failed requests during peak GPU usage periods

## The Rule
1. **GPU Queuing Protocol**: All GPU-dependent operations must use the `/v1/gpu/lock` and `/v1/gpu/unlock` endpoints to acquire/release resources safely
2. **Graceful Degradation**: When GPU resources are unavailable, return informative messages about queue status rather than 503 errors
3. **Resource Status Checks**: Use `/v1/gpu/status` to check availability before attempting GPU operations
4. **Timeout Handling**: Implement proper timeouts (60s+) for GPU resource acquisition with clear user feedback
5. **Queue Position Reporting**: Inform users of their position in the GPU queue when applicable
6. **Fallback Strategies**: For non-critical operations, implement CPU-based fallbacks when GPU is heavily queued