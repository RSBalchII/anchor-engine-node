"""
Injector Agent Implementation
"""
from typing import Dict, Any, List
from datetime import datetime
import logging
import os
import json
from ece.agents.tier3.injector.db_manager import Neo4jManager
from ece.common.poml_schemas import MemoryNode

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class InjectorAgent:
    """
    A simple, specialized Tier 3 agent whose sole responsibility is to write data to the Neo4j knowledge graph.
    It acts as the final, transactional step in the memory storage pipeline, receiving commands exclusively from the Archivist.
    """

    def __init__(self, neo4j_uri: str = None, neo4j_user: str = None, neo4j_password: str = None):
        """
        Initialize the InjectorAgent.
        
        Args:
            neo4j_uri: URI for the Neo4j database
            neo4j_user: Username for the Neo4j database
            neo4j_password: Password for the Neo4j database
        """
        # Get Neo4j connection details from environment variables, with defaults
        self.neo4j_uri = neo4j_uri or os.environ.get('NEO4J_URI', 'bolt://localhost:7688')
        self.neo4j_user = neo4j_user or os.environ.get('NEO4J_USER', 'neo4j')
        self.neo4j_password = neo4j_password or os.environ.get('NEO4J_PASSWORD', 'password')
        
        # Initialize the Neo4j manager
        self.db_manager = Neo4jManager(self.neo4j_uri, self.neo4j_user, self.neo4j_password)
        self.db_manager.connect()
        
        logger.info("InjectorAgent initialized successfully")

    def receive_data_for_injection(self, data: dict) -> Dict[str, Any]:
        """
        Internal method that the Archivist will call to pass data for injection into the Neo4j database.
        
        Args:
            data (dict): Structured data to be injected into the Neo4j database.
            
        Returns:
            dict: Result of the injection operation with success status and any relevant information.
        """
        # Log the incoming data (at debug level to avoid logging sensitive information in production)
        logger.debug(f"Received data for injection: {type(data)}")
        logger.debug(f"Data content: {data}")
        
        # Validate input data
        if not data:
            logger.error("Received empty data for injection")
            return {
                "success": False,
                "error": "No data provided for injection"
            }
            
        if not isinstance(data, dict):
            logger.error("Received invalid data type for injection")
            return {
                "success": False,
                "error": "Invalid data format provided for injection"
            }
            
        try:
            # Serialize the data into a MemoryNode POML string before injection
            memory_node_poml = MemoryNode(
                identity={
                    "name": "InjectorAgent",
                    "version": "1.0",
                    "type": "Specialized Data Injection Agent"
                },
                operational_context={
                    "project": "External Context Engine (ECE) v2.0",
                    "objective": "Inject data into the Neo4j knowledge graph."
                },
                directive={
                    "goal": "Store data in Neo4j with POML metadata.",
                    "task": {
                        "name": "SerializeAndInject",
                        "steps": [
                            "Serialize data into MemoryNode POML",
                            "Translate POML to Cypher queries",
                            "Execute queries in transaction"
                        ]
                    }
                },
                node_data=data,
                node_type="InjectionData"
            )
            
            # Convert the MemoryNode to a JSON string
            poml_string = memory_node_poml.json()
            
            # Add the POML string to the data for injection
            data_with_poml = data.copy()
            data_with_poml["poml_metadata"] = poml_string
            
            # Translate the data to Cypher queries
            cypher_queries = self._translate_to_cypher(data_with_poml)
            
            # Check if we have any queries to execute
            if not cypher_queries:
                logger.warning("No valid queries generated from data")
                return {
                    "success": True,
                    "message": "No data to inject"
                }
            
            # Log the number of queries to be executed
            logger.info(f"Translating data to {len(cypher_queries)} Cypher queries")
            
            # Execute the queries in a transaction
            success = self._execute_cypher_queries(cypher_queries)
            
            if success:
                logger.info(f"Data injection completed successfully with {len(cypher_queries)} queries")
                return {
                    "success": True,
                    "message": "Data injected successfully",
                    "queries_executed": len(cypher_queries)
                }
            else:
                logger.error("Data injection failed")
                return {
                    "success": False,
                    "error": "Data injection failed",
                    "queries_executed": len(cypher_queries)
                }
        except Exception as e:
            logger.error(f"Error during data injection: {e}")
            logger.debug(f"Exception type: {type(e)}")
            return self._handle_error(e)

    def _translate_to_cypher(self, data: dict) -> List[Dict[str, Any]]:
        """
        Translate structured JSON data into valid Cypher MERGE queries.
        
        Args:
            data (dict): Structured data to be translated.
            
        Returns:
            List[Dict[str, Any]]: List of dictionaries containing 'query' and 'parameters' keys.
        """
        queries = []
        
        # Handle entities (nodes)
        if 'entities' in data:
            logger.debug(f"Processing {len(data['entities'])} entities")
            for entity in data['entities']:
                # Create MERGE query for each entity
                # Using ON CREATE and ON MATCH to handle both new and existing nodes
                query = """
                MERGE (n:{label} {{id: $id}})
                ON CREATE SET n += $properties, n.created = timestamp()
                ON MATCH SET n += $properties, n.last_updated = timestamp()
                """
                parameters = {
                    "label": entity.get('type', 'Entity'),
                    "id": entity.get('id'),
                    "properties": entity.get('properties', {})
                }
                queries.append({
                    "query": query.strip(),
                    "parameters": parameters
                })
        
        # Handle relationships
        if 'relationships' in data:
            logger.debug(f"Processing {len(data['relationships'])} relationships")
            for relationship in data['relationships']:
                # Create MERGE query for each relationship
                # Using ON CREATE and ON MATCH to handle both new and existing relationships
                query = """
                MERGE (a:{start_label} {{id: $start_id}})
                MERGE (b:{end_label} {{id: $end_id}})
                MERGE (a)-[r:{rel_type}]->(b)
                ON CREATE SET r += $properties, r.created = timestamp()
                ON MATCH SET r += $properties, r.last_updated = timestamp()
                """
                parameters = {
                    "start_label": relationship.get('start_type', 'Entity'),
                    "start_id": relationship.get('start_id'),
                    "end_label": relationship.get('end_type', 'Entity'),
                    "end_id": relationship.get('end_id'),
                    "rel_type": relationship.get('type', 'RELATIONSHIP'),
                    "properties": relationship.get('properties', {})
                }
                queries.append({
                    "query": query.strip(),
                    "parameters": parameters
                })
        
        logger.debug(f"Generated {len(queries)} Cypher queries")
        return queries

    def _execute_cypher_queries(self, queries: List[Dict[str, Any]]) -> bool:
        """
        Execute a list of Cypher queries against the Neo4j database within a transaction.
        
        Args:
            queries (List[Dict[str, Any]]): List of queries to execute.
            
        Returns:
            bool: True if all queries executed successfully, False otherwise.
        """
        if not queries:
            logger.warning("No queries to execute")
            return True
            
        try:
            success = self.db_manager.execute_transaction(queries)
            if success:
                logger.info(f"Successfully executed {len(queries)} queries in transaction")
            else:
                logger.error("Transaction execution failed")
            return success
        except Exception as e:
            logger.error(f"Failed to execute Cypher queries: {e}")
            raise

    def _handle_error(self, error: Exception) -> Dict[str, Any]:
        """
        Handle errors that occur during data injection and report them back to the Archivist.
        
        Args:
            error (Exception): The error that occurred during data injection.
            
        Returns:
            dict: Error report to send back to the Archivist.
        """
        error_type = type(error).__name__
        error_message = str(error)
        
        logger.error(f"Handling error [{error_type}]: {error_message}")
        logger.debug(f"Error type: {error_type}, Error message type: {type(error_message)}")
        
        # Provide specific error messages based on error type
        if "database" in error_message.lower() or "connection" in error_message.lower():
            return {
                "success": False,
                "error": "Database connection error",
                "error_type": error_type,
                "details": "Unable to connect to the Neo4j database. Please check connection settings and database status."
            }
        elif "constraint" in error_message.lower():
            return {
                "success": False,
                "error": "Data constraint violation",
                "error_type": error_type,
                "details": "Data violates database constraints. Please check the data format and constraints."
            }
        elif "syntax" in error_message.lower():
            return {
                "success": False,
                "error": "Cypher syntax error",
                "error_type": error_type,
                "details": "Invalid Cypher query syntax. Please check the data translation logic."
            }
        else:
            return {
                "success": False,
                "error": "Data injection error",
                "error_type": error_type,
                "details": error_message
            }
            
    def get_or_create_timenode(self, timestamp: str) -> Dict[str, Any]:
        """
        Create a chronological tree of nodes: (Year)->[:HAS_MONTH]->(Month)->[:HAS_DAY]->(Day).
        
        Args:
            timestamp: The timestamp to create the chronological tree for (ISO format)
            
        Returns:
            Dictionary containing the day node information
        """
        try:
            # Parse the timestamp
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            
            # Call the db_manager function
            result = self.db_manager.get_or_create_timenode(dt)
            
            return {
                "success": True,
                "data": result
            }
        except Exception as e:
            logger.error(f"Error creating time node: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def link_memory_to_timenode(self, memory_node_id: int, timestamp: str) -> Dict[str, Any]:
        """
        Create a [:OCCURRED_AT] relationship to the appropriate Day node.
        
        Args:
            memory_node_id: The ID of the memory node to link
            timestamp: The timestamp to link the memory to (ISO format)
            
        Returns:
            Dictionary with success status
        """
        try:
            # Parse the timestamp
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            
            # Call the db_manager function
            success = self.db_manager.link_memory_to_timenode(memory_node_id, dt)
            
            return {
                "success": success
            }
        except Exception as e:
            logger.error(f"Error linking memory to time node: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }