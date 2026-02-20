# Add core components for Ark memory and context

**Commit:** 7d52081b4bd37b40a533e17be15b66ef8638fedd
**Date:** 2025-08-07T03:07:25
**Timestamp:** 1754557645

## Description

This commit introduces the foundational components for the Ark project's long-term memory and conversational context management.

- `docker-compose.yml`: Defines a service for running ChromaDB in a Docker container, providing a persistent vector database for the application.
- `Dockerfile`: Sets up the environment for containerizing the main Python application, including dependency installation with Poetry.
- `context_manager.py`: A module for managing conversational context, with functions to load, save, and update the conversation history.

---
#git #commit #code #anchor-engine-sync
