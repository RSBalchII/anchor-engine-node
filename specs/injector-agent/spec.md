
### 5. Injector Agent Specification (New)

* **Status:** This is a new, clean specification. It defines the role of the internal, Tier 3 `Injector` agent, which is distinct from the now-external `PromptInjector`.

# Injector Agent Specification

## 1. Overview

The Injector is a simple, specialized **Tier 3** agent whose sole responsibility is to write data to the `Neo4j` knowledge graph. It acts as the final, transactional step in the memory storage pipeline, receiving commands exclusively from the `Archivist`.

## 2. User Story

As a data writing service, I want to receive structured data and commands from the `Archivist` so that I can reliably and safely write that information to the `Neo4j` knowledge graph.

## 3. Functional Requirements

### 3.1 Data Writing
- The agent **must** be able to receive structured data (e.g., JSON) from the `Archivist`.
- The agent **must** translate this structured data into Cypher queries to create or merge nodes and relationships in the `Neo4j` graph.
- The agent **must** execute these queries against the `Neo4j` database.

### 3.2 Data Integrity
- The agent **must** perform all write operations in a way that ensures data integrity. It should use `MERGE` operations where appropriate to avoid creating duplicate nodes.
- It **must** handle potential write errors from the database gracefully.

## 4. Non-Functional Requirements

### 4.1 Reliability
- The agent must be highly reliable. A failure during a write operation could lead to data loss or corruption in the knowledge graph.
- It should implement a retry mechanism for transient database errors.

## 5. Integration Points

-   **Controller/Caller:** `Archivist` Agent (Tier 3)
-   **Target Database:** `Neo4j` Knowledge Graph (Tier 3)

## 6. Acceptance Criteria

-   **Given** a valid, structured data object from the `Archivist`, **when** the Injector processes it, **then** the corresponding nodes and relationships should be correctly created or merged in the `Neo4j` graph.
-   **Given** an invalid data object, **when** the Injector attempts to write it, **then** it should fail gracefully and report a clear error back to the `Archivist` without crashing.