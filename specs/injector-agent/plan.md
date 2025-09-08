
# QLearningAgent - plan.md

This plan outlines the implementation strategy for the `QLearningAgent`.

### 1. Core Logic
* **Language/Framework:** Python 3.11+.
* **Q-Table Management:** The Q-Table will be implemented using a **NumPy** array for efficient numerical operations. We will create a mapping between graph node IDs and NumPy array indices.
* **Graph Traversal:** The agent will use the `neo4j` driver to fetch the graph's topology. The Q-Learning algorithm (epsilon-greedy strategy) will be implemented in Python to decide the next action (which node to traverse to) based on the Q-Table values.

### 2. Persistence
* **Strategy:** After a training cycle, the agent will iterate through its updated Q-Table and execute Cypher queries to `MERGE` the Q-values as a property onto the corresponding relationships in the Neo4j graph. This makes the learned intelligence persistent and directly observable in the graph.

### 3. API
* **Interface:** It will expose a primary method, `find_optimal_path(start_node_id: str, end_node_id: str)`, for the `Archivist` to call.
