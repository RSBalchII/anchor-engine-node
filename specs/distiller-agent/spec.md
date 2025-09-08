
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