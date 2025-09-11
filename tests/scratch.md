Of course. I will now generate the adjusted and newly-created specifications for the core ECE agents, reflecting our updated, tiered architecture. I will present them one by one for your review, starting with the most critical revision: the `Archivist` agent.

Here are the revised and new `spec.md` files.

***

### 1. Archivist Agent Specification (Revised)

* **Status:** This specification has been substantially rewritten to reflect the `Archivist`'s new role as the central hub of the Memory Cortex and the primary API gateway for the entire ECE.

# Archivist Agent Specification

## 1. Overview

The Archivist is the master controller of the **Tier 3 Memory Cortex**. It serves as the primary API gateway for external requests for context and acts as the central coordinator for all long-term memory operations. It manages the flow of information between the `Distiller`, the `Extractor`'s input, the `QLearningAgent`, and the `Injector`, ensuring the `Neo4j` knowledge graph remains coherent and accessible.

## 2. User Story

As the ECE's memory manager, I want to handle all requests for long-term context and manage the data pipeline for memory storage so that the ECE can provide relevant information to external tools and maintain a persistent, structured knowledge base.

## 3. Functional Requirements

### 3.1 External API Gateway
- The agent **must** expose a secure API endpoint to handle context retrieval requests from external modules (like the `PromptInjector`).
- The API **must** accept a query (e.g., a raw user prompt) and return relevant context.

### 3.2 Context Retrieval
- Upon receiving an API request, the agent **must** task the `QLearningAgent` with finding the most relevant paths and concepts in the `Neo4j` knowledge graph.
- The agent **must** synthesize the results from the `QLearningAgent` into a structured, coherent context package to be returned via the API.

### 3.3 Data Flow Management
- The agent **must** receive distilled summaries from the `Distiller` agent.
- The agent **must** receive scraped text from the external `Extractor` module.
- The agent **must** make the final decision on what information is worthy of being stored in long-term memory.
- The agent **must** command the `Injector` agent to write approved, structured data to the `Neo4j` knowledge graph.

## 4. Non-Functional Requirements

### 4.1 Performance
- API responses should be delivered with minimal latency. The agent should employ caching strategies where appropriate for frequently requested context.

### 4.2 Reliability
- The agent must handle errors gracefully from any of its subordinate agents (`QLearningAgent`, `Injector`) and return a meaningful error status via the API.

### 4.3 Security
- The API endpoint must be secured to prevent unauthorized access to the ECE's memory.

## 5. Integration Points

-   **External (API):** `PromptInjector`, `Extractor` (Browser Extension)
-   **Subordinates (Internal):**
    * `QLearningAgent` (for querying)
    * `Injector` (for writing)
-   **Data Sources (Internal):** `Distiller`

## 6. Acceptance Criteria

-   **Given** an API request from the `PromptInjector` containing a user query, **when** the Archivist processes it, **then** it must query the `QLearningAgent` and return a structured JSON object containing the most relevant context.
-   **Given** a distilled summary received from the `Distiller`, **when** the Archivist processes it, **then** it must command the `Injector` to write the data to the knowledge graph.
-   **Given** that the `QLearningAgent` fails to find a relevant path, **when** the Archivist receives the result, **then** it must return an empty context package via the API without crashing.

---

### 2. Distiller Agent Specification (Revised)

* **Status:** This specification has been updated to clarify its precise role and integration points within the Memory Cortex.

# Distiller Agent Specification

## 1. Overview

The Distiller is a specialized **Tier 3** agent that operates automatically in the background. Its sole function is to process the stream of information from the `Redis Context Cache`, create structured summaries, and pass them to the `Archivist` for potential long-term storage.

## 2. User Story

As a knowledge processing agent, I want to periodically distill raw, unstructured text from the short-term cache into structured, meaningful data so that the `Archivist` can efficiently manage and store it in the long-term knowledge graph.

## 3. Functional Requirements

### 3.1 Text Processing
- The agent **must** monitor and process the contents of the `Redis Context Cache`. This can be triggered on a timer or based on the volume of new data.
- The agent **must** identify key entities, relationships, and concepts from the unstructured text in the cache.

### 3.2 Data Structuring
- The agent **must** convert the identified information into a structured data format (e.g., JSON) that is optimized for the `Neo4j` knowledge graph.
- The agent **must** forward this structured data to the `Archivist` for review and injection.

## 4. Non-Functional Requirements

### 4.1 Accuracy
- The agent should have high accuracy in entity and relationship extraction to ensure the quality of the knowledge graph.

### 4.2 Performance
- The agent should process text efficiently and operate with a low-resource footprint, as it will be running continuously.

## 5. Integration Points

-   **Input:** `Redis Context Cache` (Tier 1)
-   **Output:** `Archivist` Agent (Tier 3)

## 6. Acceptance Criteria

-   **Given** a `Redis Context Cache` containing recent conversation logs, **when** the Distiller agent runs, **then** it should extract key entities and their relationships.
-   **Given** the extracted entities, **when** the agent completes its process, **then** it should send a structured JSON object representing this information to the `Archivist`.

---

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

---

---
