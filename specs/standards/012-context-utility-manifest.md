# Standard 012: Context Utility Manifest

**Authority:** Active | **Philosophy:** Invisible Infrastructure

## The Principle
The Anchor Core is not a "Chat App". It is a **Context Utility** (like electricity or WiFi).
1.  **Headless First**: The system must provide value without a visible UI window.
2.  **Passive Observation**: Data ingestion should happen automatically (Daemon Eyes) rather than requiring manual user input.
3.  **Universal Availability**: Context must be accessible via standard HTTP endpoints (`/v1/memory/search`) to any client (Terminal, VS Code, Browser).

## The Rules
1.  **No UI Blocking**: Long-running tasks (like VLM analysis) MUST run in background threads/processes.
2.  **Zero-Touch Ingestion**: Screen/Audio capture must require zero clicks after initial activation.
3.  **Ground Truth**: All ingested context is immutable "Ground Truth" until proven otherwise.