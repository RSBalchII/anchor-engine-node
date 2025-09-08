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

## 6. Technical Implementation Details

### 6.1 Core Components

1. **InjectorAgent**: The main class that handles data reception and coordination.
2. **Neo4jManager**: Manages the connection to the Neo4j database and executes queries with retry logic for transient errors.

### 6.2 Data Format

The agent expects data in the following JSON format:

```json
{
  "entities": [
    {
      "id": "unique_identifier",
      "type": "NodeType",
      "properties": {
        "property1": "value1",
        "property2": "value2"
      }
    }
  ],
  "relationships": [
    {
      "start_id": "source_entity_id",
      "start_type": "SourceNodeType",
      "end_id": "target_entity_id",
      "end_type": "TargetNodeType",
      "type": "RELATIONSHIP_TYPE",
      "properties": {
        "property1": "value1",
        "property2": "value2"
      }
    }
  ]
}
```

### 6.3 Cypher Query Generation

#### Entities (Nodes)
```cypher
MERGE (n:{label} {id: $id})
ON CREATE SET n += $properties, n.created = timestamp()
ON MATCH SET n += $properties, n.last_updated = timestamp()
```

#### Relationships
```cypher
MERGE (a:{start_label} {id: $start_id})
MERGE (b:{end_label} {id: $end_id})
MERGE (a)-[r:{rel_type}]->(b)
ON CREATE SET r += $properties, r.created = timestamp()
ON MATCH SET r += $properties, r.last_updated = timestamp()
```

### 6.4 Configuration

The agent can be configured using environment variables:

- `NEO4J_URI` - URI for the Neo4j database (default: "bolt://localhost:7688")
- `NEO4J_USER` - Username for the Neo4j database (default: "neo4j")
- `NEO4J_PASSWORD` - Password for the Neo4j database (default: "password")

### 6.5 Error Handling

The agent handles various types of errors:
1. Database connection errors
2. Data constraint violations
3. Cypher syntax errors
4. Other general errors

For transient errors, the agent implements a retry mechanism with exponential backoff.

## 7. Acceptance Criteria

-   **Given** a valid, structured data object from the `Archivist`, **when** the Injector processes it, **then** the corresponding nodes and relationships should be correctly created or merged in the `Neo4j` graph.
-   **Given** an invalid data object, **when** the Injector attempts to write it, **then** it should fail gracefully and report a clear error back to the `Archivist` without crashing.