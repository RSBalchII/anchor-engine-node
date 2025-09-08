
# Distiller Agent - tasks.md

This document breaks down the work required to implement the `Distiller` agent.

### Phase 1: Core Functionality

-   [ ] **Task 1.1: Project Scaffolding**
    -   Create the directory and main agent file: `ece/agents/tier3/distiller/distiller_agent.py`.
-   [ ] **Task 1.2: Redis Cache Connection**
    -   Implement the logic to connect to the Redis instance and read data from the context cache.
-   [ ] **Task 1.3: Trigger Mechanism**
    -   Implement a trigger for the distillation process (e.g., a simple cron-like timer that runs every N minutes).

### Phase 2: Text Processing

-   [ ] **Task 2.1: Entity Extraction Logic**
    -   Integrate a library (like spaCy or a transformer model) to perform Named Entity Recognition (NER) on the text from the cache.
-   [ ] **Task 2.2: Relationship Identification**
    -   Implement logic to identify potential relationships between the extracted entities.
-   [ ] **Task 2.3: Data Structuring**
    -   Implement the logic to convert the extracted entities and relationships into the structured JSON format required by the `Archivist`.

### Phase 3: Integration & Reliability

-   [ ] **Task 3.1: Output to Archivist**
    -   Implement the internal API call to send the final structured JSON to the `Archivist`.
-   [ ] **Task 3.2: State Management**
    -   Implement a mechanism to track which cache entries have already been processed to avoid redundant work.
-   [ ] **Task 3.3: Testing**
    -   Write unit tests for the text processing and data structuring logic.
