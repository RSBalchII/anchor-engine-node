
### **File: `/specs/tasks.md`**


# Core ECE Project - Task List v2.0

This document outlines the tasks required to implement the ECE v2.0 architecture.

### Phase 1: Foundational Upgrades

- [ ] **Task 1.1: Implement POML Protocol**
  - [ ] Define the core `POML` schemas for inter-agent communication.
  - [ ] Refactor all agent API endpoints to send and receive `POML` directives.
  - [ ] Update the `Injector` to store all memories in the knowledge graph as `POML` documents.

- [ ] **Task 1.2: Implement Continuous Temporal Scanning**
  - [ ] Modify the `Archivist` to run as a persistent, streaming consumer of the Redis cache.
  - [ ] Implement the `TimeNode` schema in the `db_manager`.
  - [ ] Add logic to the `Archivist` to create and link memories to the chronological spine in Neo4j.

### Phase 2: Advanced Reasoning Workflows

- [ ] **Task 2.1: Implement Exploratory Problem-Solving Loop**
  - [ ] Create the `ExplorerAgent` persona and implementation.
  - [ ] Create the `CritiqueAgent` persona and implementation.
  - [ ] Develop the secure `SandboxModule` for code execution.
  - [ ] Implement the iterative, score-based loop logic within the `Orchestrator`.

- [ ] **Task 2.2: Implement Parallel Thinking**
  - [ ] Add logic to the `Orchestrator` to instantiate multiple, concurrent `Thinker` agents for a single complex query.
  - [ ] Create a set of diverse `Thinker` personas (Optimist, Pessimist, Creative, etc.).
  - [ ] Implement the synthesis logic in the `Orchestrator` to combine parallel outputs into a single, robust answer.

### Phase 3: Integration & Testing

- [ ] **Task 3.1: Full System Integration**
  - [ ] Update the `docker-compose.yaml` with the new agent services.
  - [ ] Ensure all agents are communicating correctly using the `POML` protocol.

- [ ] **Task 3.2: End-to-End Testing**
  - [ ] Develop test cases for the Parallel Thinking workflow.
  - [ ] Develop test cases for the Exploratory Problem-Solving loop.
  - [ ] Write queries to verify the chronological spine in the Neo4j database.
```