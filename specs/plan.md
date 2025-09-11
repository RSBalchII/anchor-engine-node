
### **File: `/specs/plan.md`**

```markdown
# Core ECE Project - Implementation Plan v2.0

This document outlines the high-level technical plan for the enhanced ECE.

### 1. Environment and Containerization
* **Strategy:** Continue using **Docker Compose** to orchestrate all services (`Orchestrator`, agents, `Neo4j`, `Redis`). The environment will be updated to include the new `ExplorerAgent`, `CritiqueAgent`, and a secure `SandboxModule` container.

### 2. Inter-Agent Communication
* **Strategy:** Implement the **`POML` Inter-Agent Communication Protocol**. All internal API calls between agents (via FastAPI) will pass `POML` documents as the payload, ensuring structured, unambiguous tasking.

### 3. Core Logic Enhancements
* **Orchestrator:** The `Orchestrator`'s main loop will be refactored to manage the **Parallel Thinking** and **Exploratory Problem-Solving** workflows. This includes logic for instantiating multiple thinkers, managing the iterative scoring loop, and synthesizing diverse results.
* **Archivist:** The `Archivist` will be re-implemented as a continuous, background process that monitors the Redis stream, creates temporal nodes in Neo4j, and links memories to them.
* **Injector:** The `Injector` will be updated to serialize all incoming data into the **`POML` cognitive datatype** before writing to the Neo4j knowledge graph.

### 4. Database Schema
* **Strategy:** The Neo4j schema will be updated to include `TimeNodes` (e.g., `(y:Year)-[:HAS_MONTH]->(m:Month)-[:HAS_DAY]->(d:Day)`) to form the chronological spine. All `MemoryNodes` will be linked to a `TimeNode` via a `[:OCCURRED_AT]` relationship.
