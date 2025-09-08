
### 4. Context Cache Specification (Revised)

* **Status:** This specification has been updated to clarify that the cache is a passive component managed by the `Orchestrator`.

# Context Cache Specification

## 1. Overview

The Context Cache is the high-speed, short-term memory layer of the ECE, corresponding to **Tier 1**. It is a **passive component**, not an agent. It is implemented using Redis Stack and is managed exclusively by the `Orchestrator` agent to provide fast retrieval of recent and semantically similar information.

## 2. Purpose

The Context Cache serves as the ECE's working memory. It enables:
1.  Fast retrieval of recently accessed information for the `Orchestrator`.
2.  A data source for the `Distiller` agent to process for long-term storage.
3.  Reduced load on the `Neo4j` knowledge graph for common queries.

## 3. Key Features
- **Managed Component**: All operations (read, write, delete) are initiated and controlled by the `Orchestrator`.
- **Redis Integration**: Leverages Redis Stack for efficient key-value storage, vector similarity search, and TTL management.

## 4. Integration Points
- **Primary Manager:** `Orchestrator` Agent (Tier 1)
- **Data Consumer:** `Distiller` Agent (Tier 3)

## 5. Acceptance Criteria

-   **Given** that the `Orchestrator` needs to store a piece of context, **when** it calls the cache's `store` function, **then** the data should be successfully written to Redis.
-   **Given** that the `Distiller` agent needs to process the cache, **when** it queries the cache, **then** it should receive the current contents of the cache.
