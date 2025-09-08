
# QLearningAgent - tasks.md

This document breaks down the work required to implement the `QLearningAgent`.

### Phase 1: Core Algorithm

-   [x] **Task 1.1: Project Scaffolding**
    -   Create the directory and main agent file: `ece/agents/tier3/qlearning/qlearning_agent.py`.
-   [x] **Task 1.2: Neo4j Graph Interface**
    -   Implement the connection to the Neo4j database.
    -   Create methods to query the graph structure (nodes and relationships).
-   [x] **Task 1.3: Q-Learning Logic**
    -   Implement the core Q-Learning algorithm for pathfinding.
    -   Implement the Q-Table data structure.

### Phase 2: Persistence & Training

-   [x] **Task 2.1: Q-Value Persistence**
    -   Implement the logic to `MERGE` learned Q-values as properties onto relationships in the Neo4j graph.
-   [x] **Task 2.2: Continuous Training Loop**
    -   Implement a background process for the agent to continuously explore the graph and refine its Q-values.

### Phase 3: API & Integration

-   [x] **Task 3.1: API for Archivist**
    -   Implement the internal method that the `Archivist` will call to request a path (e.g., `find_optimal_path(start_node, end_node)`).
-   [x] **Task 3.2: Unit & Integration Testing**
    -   Write unit tests for the Q-Learning pathfinding logic.
    -   Write integration tests to ensure the agent can connect to Neo4j and correctly read/write Q-values.
