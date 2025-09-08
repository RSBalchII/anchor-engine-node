
### 3. QLearningAgent Specification (Revised)

* **Status:** This specification was formerly named `Graph R1 Module`. It has been renamed and its role has been clarified to be a specialized tool subordinate to the `Archivist`.

# QLearningAgent Specification

## 1. Overview

The QLearningAgent is a specialized **Tier 3** agent. It is not a standalone actor but rather a highly advanced tool that the `Archivist` uses to perform intelligent, Reinforcement Learning-guided navigation of the `Neo4j` knowledge graph. Its purpose is to find the most relevant and efficient paths between concepts in response to a query.

## 2. User Story

As a graph navigation tool, I want to use a Q-Learning algorithm to traverse the knowledge graph so that I can provide the `Archivist` with the most relevant paths and context for any given query.

## 3. Functional Requirements

### 3.1 Graph Navigation & Path Finding
- The module **must** implement a Q-Learning algorithm to find optimal paths between nodes in the `Neo4j` graph.
- It **must** accept a query from the `Archivist` (containing start and potential end nodes) and return a ranked list of the most relevant paths based on learned Q-values.

### 3.2 Q-Table & Model Management
- The agent **must** manage a Q-Table for storing state-action values.
- It **must** persist its learned Q-values as properties on the relationships within the `Neo4j` graph itself, allowing its intelligence to be shared and persistent.

### 3.3 Training
- The agent **must** support continuous training on the graph data to improve its pathfinding capabilities over time.

## 4. Integration Points

-   **Controller/Caller:** `Archivist` Agent (Tier 3)
-   **Data Source:** `Neo4j` Knowledge Graph (Tier 3)

## 5. Acceptance Criteria

-   **Given** a query from the `Archivist` with a start and end node, **when** the agent processes it, **then** it should return the path with the highest cumulative Q-value.
-   **Given** a successful path traversal, **when** the agent's training cycle runs, **then** the Q-values on the corresponding relationships in the `Neo4j` graph should be updated.

