# Standard 032: Ghost Engine Initialization and Ingestion Flow

## What Happened?
The Ghost Engine was experiencing race conditions where memory ingestion requests were being processed before the database was fully initialized. This caused errors like "Cannot read properties of null (reading 'run')" and inconsistent ingestion behavior between the Bridge API logs and the Ghost Engine logs.

## The Cost
- Database ingestion failures when Ghost Engine connected to Bridge before database initialization completed
- Inconsistent logging between Bridge and Ghost Engine (Bridge showing success, Ghost Engine showing failures)
- Race conditions where ingestion requests arrived before database was ready
- Poor user experience with failed memory operations
- Confusing error messages in the UI

## The Rule
1. **Sequential Initialization**: The Ghost Engine must initialize the database completely before signaling readiness to the Bridge.

2. **Database Readiness Checks**: All ingestion and search operations must verify that the database object is properly initialized before attempting operations.

3. **Proper Error Handling**: When database is not ready, the Ghost Engine must return appropriate error messages to the Bridge instead of failing silently.

4. **Synchronous Connection Flow**: WebSocket connection must follow: Connect → Initialize Database → Signal Ready → Process Requests.

5. **Graceful Degradation**: If database initialization fails, the Ghost Engine must report the error to the Bridge and not attempt to process requests.

6. **Message Type Handling**: The system must properly handle all message types including `engine_error` responses.

## Implementation
- Modified WebSocket connection flow to initialize database before signaling readiness
- Added database readiness checks in `handleIngest` and `handleSearch` functions
- Implemented proper error responses when database is not ready
- Added support for `engine_error` message type handling
- Enhanced error logging with fallbacks to prevent "undefined" messages
- Ensured sequential processing: Connect → DB Init → Ready Signal → Process Requests