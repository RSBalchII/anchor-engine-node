# Standard 015: Browser-Based Control Center Architecture

## What Happened?
The system had fragmented interfaces requiring users to interact with both browser UI and terminal commands. Context retrieval required switching between interfaces, and vision processing required separate Python scripts. This created inefficient workflows and poor user experience.

## The Cost
- 6+ hours spent switching between browser and terminal for different operations
- Fragmented workflow requiring multiple interfaces for simple tasks
- Poor visibility into system state across different components
- Inefficient context retrieval and vision processing workflows
- Users had to remember multiple endpoints and interfaces

## The Rule
1. **Unified Browser Interface**: All primary operations (context retrieval, vision processing, memory search) must be accessible through browser-based UI at `http://localhost:8000/sidecar`
2. **Dual-Tab Architecture**: Interface must have separate tabs for "Retrieve" (context search) and "Observe" (vision processing) to prevent workflow interference
3. **File-Based Logging**: All system components must write to individual log files in the `logs/` directory with automatic truncation to 1000 lines
4. **Centralized Log Access**: All logs must be accessible via `/logs/recent` endpoint and consolidated in `log-viewer.html`
5. **Python VLM Integration**: Vision processing must be handled by dedicated Python module (`vision_engine.py`) with Ollama backend support
6. **Endpoint Consistency**: All UI components must use consistent endpoint patterns (`/v1/namespace/action`)
7. **Error Handling**: All operations must provide clear, actionable error messages to the user interface
8. **State Visibility**: System state (engine status, GPU availability, memory status) must be visible in the UI