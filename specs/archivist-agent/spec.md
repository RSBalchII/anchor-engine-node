
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
