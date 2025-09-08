
# Core ECE Project - plan.md

This document outlines the high-level technical plan for the ECE infrastructure.

### 1. Environment and Containerization
* **Strategy:** We will use **Docker Compose** to orchestrate the entire application. A primary `Dockerfile` will define the Python environment for all our agents, ensuring consistency.
* **Services:** The `docker-compose.yaml` file will define services for the core ECE application, a **Neo4j** database, and a **Redis** instance.
* **Dependencies:** We will manage Python dependencies using a `requirements.txt` file, including libraries like `fastapi`, `uvicorn`, `neo4j`, `redis`, `spacy`, and `numpy`.

### 2. Inter-Agent Communication
* **Strategy:** For simplicity and performance within our Docker network, direct internal API calls will be used. We will leverage **FastAPI** to define a simple, internal RESTful API for each agent that needs to be called by another. For instance, the `Archivist` will have endpoints that the `Distiller` can post to.

### 3. Configuration
* **Strategy:** A central `config.py` module will load settings from environment variables, which will be injected into the containers via the `docker-compose.yaml`. This keeps our configuration separate from the code and secure.