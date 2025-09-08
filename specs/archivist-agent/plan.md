
# Archivist Agent - plan.md

This plan outlines the implementation strategy for the `Archivist` agent.

### 1. Core Logic
* **Language/Framework:** Python 3.11+ with **FastAPI**.
* **External API:** We will define a main API endpoint using FastAPI (e.g., `POST /context`). This endpoint will handle requests from the external browser extension. It will be responsible for parsing the incoming query and initiating the context retrieval process.
* **Coordination:** The `Archivist` will act as a controller. Its core logic will be to:
    1.  Receive an external request.
    2.  Call the `QLearningAgent`'s `find_optimal_path` method.
    3.  Receive the path data.
    4.  Format the data into a clean JSON response.
    5.  Return the response.
    It will also have an internal endpoint (e.g., `POST /internal/data_to_archive`) to receive data from the `Distiller` and subsequently call the `Injector`.