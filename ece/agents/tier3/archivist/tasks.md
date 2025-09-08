# Archivist Agent - tasks.md

This document breaks down the work required to implement the `Archivist` agent.

### Phase 1: Scaffolding & API

-   [x] **Task 1.1: Project Scaffolding**
    -   Create the directory and main agent file: `ece/agents/tier3/archivist/archivist_agent.py`.
-   [x] **Task 1.2: External API Gateway**
    -   Implement a secure, public-facing API endpoint (e.g., using FastAPI) to handle context requests.
    -   Define the request and response models for this endpoint.

### Phase 2: Internal Coordination

-   [x] **Task 2.1: QLearningAgent Integration**
    -   Implement the internal client logic to call the `QLearningAgent`'s `find_optimal_path` method.
-   [x] **Task 2.2: Injector Integration**
    -   Implement the internal client logic to call the `Injector`'s `receive_data_for_injection` method.
    -   NOTE: There is an issue with the error handling that needs further investigation. The integration works at a basic level, but there's a "'str' object is not callable" error that occurs during HTTP communication.
-   [x] **Task 2.3: Distiller Integration**
    -   Implement the internal API endpoint to receive structured data from the `Distiller`.

### Phase 3: Core Logic & Testing

-   [x] **Task 3.1: Context Synthesis**
    -   Implement the logic to process the path data returned by the `QLearningAgent` and synthesize it into a clean context package for the API response.
-   [x] **Task 3.2: Injection Logic**
    -   Implement the business logic to decide which data received from the `Distiller` should be sent to the `Injector`.
-   [x] **Task 3.3: End-to-End Testing**
    -   Write integration tests that simulate a call from the `PromptInjector`, ensuring the `Archivist` correctly coordinates with the `QLearningAgent` and returns a valid context.