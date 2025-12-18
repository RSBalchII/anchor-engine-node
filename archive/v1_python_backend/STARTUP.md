# System Startup Guide

Follow these steps to start the Context-Engine system with the new SGR architecture.

## Prerequisites

1.  **Python 3.10+** installed.
2.  **Redis** running on port 6379.
3.  **Neo4j** running on port 7687.

## 1. Install Dependencies

**Backend:**
```powershell
cd backend
pip install -e .
```

**Anchor Chat (TUI):**
```powershell
pip install textual httpx
```

## 2. Start the LLM Server

Open a new terminal and run:
```powershell
python start_llm_server.py
```
*Follow the interactive prompts to select your model.*

## 3. Start the Backend Server

Open a new terminal and run:
```powershell
cd backend
python launcher.py
```
*The server will start on http://localhost:8000.*

## 4. Start Anchor Chat

Open a new terminal and run:
```powershell
python anchor-chat/main.py
```
*This will launch the TUI. You can now chat with the system.*

## Troubleshooting

- **Connection Error in TUI**: Ensure the backend is running on port 8000.
- **LLM Error**: Ensure the LLM server is running on port 8080.
- **Database Errors**: Ensure Redis and Neo4j are running.
