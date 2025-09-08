# Injector Agent

The Injector is a simple, specialized Tier 3 agent whose sole responsibility is to write data to the Neo4j knowledge graph. It acts as the final, transactional step in the memory storage pipeline, receiving commands exclusively from the Archivist.

## Overview

The Injector Agent receives structured data from the Archivist and translates it into Cypher queries to create or merge nodes and relationships in the Neo4j graph. It ensures data integrity by using MERGE operations and handles potential write errors gracefully.

## Features

- **Data Writing**: Receives structured data (JSON) from the Archivist and translates it into Cypher queries.
- **Data Integrity**: Uses MERGE operations to avoid creating duplicate nodes and ensures data integrity.
- **Reliability**: Implements a retry mechanism for transient database errors.
- **Error Handling**: Gracefully handles potential write errors from the database.

## Installation

1. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

## Usage

The Injector Agent can be configured using environment variables for secure credential management:

- `NEO4J_URI` - URI for the Neo4j database (default: "bolt://localhost:7688")
- `NEO4J_USER` - Username for the Neo4j database (default: "neo4j")
- `NEO4J_PASSWORD` - Password for the Neo4j database (default: "password")

1. Create an instance of the InjectorAgent:
   ```python
   import os
   from injector_agent import InjectorAgent
   
   # Get Neo4j connection details from environment variables
   neo4j_uri = os.environ.get('NEO4J_URI', 'bolt://localhost:7688')
   neo4j_user = os.environ.get('NEO4J_USER', 'neo4j')
   neo4j_password = os.environ.get('NEO4J_PASSWORD', 'password')
   
   injector = InjectorAgent(
       neo4j_uri=neo4j_uri,
       neo4j_user=neo4j_user,
       neo4j_password=neo4j_password
   )
   ```

2. Call the `receive_data_for_injection` method with structured data:
   ```python
   data = {
       "entities": [
           {
               "id": "person_1",
               "type": "Person",
               "properties": {
                   "name": "John Doe",
                   "age": 30
               }
           }
       ],
       "relationships": [
           {
               "start_id": "person_1",
               "start_type": "Person",
               "end_id": "company_1",
               "end_type": "Company",
               "type": "WORKS_FOR",
               "properties": {
                   "since": "2020-01-01"
               }
           }
       ]
   }
   
   result = injector.receive_data_for_injection(data)
   ```

## Testing

Run unit tests:
```
python -m unittest tests/injector_agent/test_injector_agent.py
```

Run integration tests (requires Neo4j database):
```
python -m unittest tests/injector_agent/test_integration.py
```

## Architecture

The Injector Agent consists of the following components:

1. **InjectorAgent**: The main class that handles data reception and coordination.
2. **Neo4jManager**: Manages the connection to the Neo4j database and executes queries.
3. **Logging**: Comprehensive logging for monitoring and debugging.

## Integration Points

- **Controller/Caller**: Archivist Agent (Tier 3)
- **Target Database**: Neo4j Knowledge Graph (Tier 3)