
"""
ECE Tools for the External Context Engine
Contains implementations for DistillerAgent, ArchivistAgent, and ExtractorAgent
"""
from typing import Dict, Any, List, Optional
import logging
import ollama
from external_context_engine.utils.db_manager import Neo4jManager

logger = logging.getLogger(__name__)


class DistillerAgent:
    """
    Agent responsible for distilling raw text into structured, meaningful data
    for storage in the knowledge graph.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the DistillerAgent.
        
        Args:
            config: Configuration dictionary for the agent
        """
        self.config = config or {}
        self.name = "DistillerAgent"
        self.description = "Distills raw text into structured data for knowledge graph storage"
        self.model = self.config.get("model", "llama3.1")
        
    async def execute(self, raw_text: str, **kwargs) -> Dict[str, Any]:
        """
        Process raw text and extract structured information.
        
        Args:
            raw_text: The raw text to process
            **kwargs: Additional parameters for processing
            
        Returns:
            Dictionary containing structured data for storage
        """
        logger.info("Processing raw text with DistillerAgent")
        
        # Create prompt for LLM to extract structured information
        prompt = f"""
        Please analyze the following text and extract structured information that would be useful 
        for storing in a knowledge graph. Return the information in JSON format with the following structure:
        
        {{
            "entities": [
                {{
                    "name": "Entity Name",
                    "type": "Entity Type",
                    "description": "Brief description"
                }}
            ],
            "relationships": [
                {{
                    "source": "Source Entity Name",
                    "target": "Target Entity Name",
                    "type": "Relationship Type",
                    "description": "Relationship description"
                }}
            ],
            "key_points": [
                "Key point 1",
                "Key point 2"
            ],
            "summary": "A brief summary of the text"
        }}
        
        Text to analyze:
        {raw_text}
        
        Please provide only the JSON response, nothing else.
        """
        
        try:
            # Make actual LLM call
            response = ollama.generate(model=self.model, prompt=prompt, format="json")
            structured_data = response["response"]
            
            # Add metadata
            results = {
                "raw_text": raw_text,
                "structured_data": structured_data,
                "agent": self.name,
                "model_used": self.model
            }
            
            return results
        except Exception as e:
            logger.error(f"Failed to process text with DistillerAgent: {e}")
            # Fallback to simulated response in case of error
            return {
                "raw_text": raw_text,
                "structured_data": {
                    "entities": [
                        {
                            "name": "Sample Entity",
                            "type": "Sample Type",
                            "description": "Sample description from processed text"
                        }
                    ],
                    "relationships": [
                        {
                            "source": "Sample Entity",
                            "target": "Another Entity",
                            "type": "related_to",
                            "description": "Sample relationship"
                        }
                    ],
                    "key_points": ["Sample key point from text"],
                    "summary": "Sample summary of the text"
                },
                "agent": self.name,
                "model_used": self.model,
                "error": str(e)
            }


class ArchivistAgent:
    """
    Agent responsible for storing and retrieving information from the knowledge graph.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the ArchivistAgent.
        
        Args:
            config: Configuration dictionary for the agent
        """
        self.config = config or {}
        self.name = "ArchivistAgent"
        self.description = "Manages storage and retrieval of information in the knowledge graph"
        self.db_manager = Neo4jManager(
            uri=self.config.get("neo4j_uri", "bolt://localhost:7687"),
            user=self.config.get("neo4j_user", "neo4j"),
            password=self.config.get("neo4j_password", "password")
        )
        
    async def execute(self, action: str, data: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Execute an action (store or retrieve) in the knowledge graph.
        
        Args:
            action: The action to perform ("store" or "retrieve")
            data: The data to process
            **kwargs: Additional parameters for the action
            
        Returns:
            Dictionary containing the results of the action
        """
        logger.info(f"Executing {action} action with ArchivistAgent")
        
        try:
            # Connect to database
            self.db_manager.connect()
            
            if action == "store":
                result = await self._store_data(data)
            elif action == "retrieve":
                result = await self._retrieve_data(data)
            else:
                raise ValueError(f"Unknown action: {action}")
                
            # Disconnect from database
            self.db_manager.disconnect()
            
            return result
        except Exception as e:
            logger.error(f"Failed to execute {action} with ArchivistAgent: {e}")
            # Ensure database connection is closed even in case of error
            try:
                self.db_manager.disconnect()
            except:
                pass
            raise
            
    async def _store_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Store structured data in the knowledge graph.
        
        Args:
            data: Structured data to store
            
        Returns:
            Dictionary containing storage results
        """
        logger.info("Storing data in knowledge graph")
        
        structured_data = data.get("structured_data", {})
        entities = structured_data.get("entities", [])
        relationships = structured_data.get("relationships", [])
        
        created_nodes = []
        created_relationships = []
        
        # Create nodes for entities
        for entity in entities:
            node_data = {
                "name": entity.get("name"),
                "type": entity.get("type"),
                "description": entity.get("description")
            }
            try:
                node_result = self.db_manager.create_node("Entity", node_data)
                created_nodes.append(node_result)
            except Exception as e:
                logger.error(f"Failed to create node for entity {entity.get('name')}: {e}")
        
        # Create relationships
        for relationship in relationships:
            # In a real implementation, we would need to find the actual node IDs
            # For now, we'll simulate this
            try:
                # This is a simplified implementation - in reality, we would need to 
                # look up the actual node IDs based on the entity names
                rel_data = {
                    "type": relationship.get("type"),
                    "description": relationship.get("description")
                }
                # Using dummy IDs for demonstration
                rel_result = self.db_manager.create_relationship(
                    "1", "2", relationship.get("type"), rel_data
                )
                created_relationships.append(rel_result)
            except Exception as e:
                logger.error(f"Failed to create relationship: {e}")
        
        return {
            "action": "store",
            "nodes_created": len(created_nodes),
            "relationships_created": len(created_relationships),
            "agent": self.name
        }
        
    async def _retrieve_data(self, query_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Retrieve data from the knowledge graph based on a query.
        
        Args:
            query_data: Query parameters
            
        Returns:
            Dictionary containing retrieved data
        """
        logger.info("Retrieving data from knowledge graph")
        
        query = query_data.get("query", "")
        
        # Create prompt for LLM to convert natural language query to Cypher
        prompt = f"""
        Convert the following natural language query to a Cypher query for a Neo4j database 
        with nodes labeled "Entity" and relationships of various types. Return only the Cypher query.
        
        Query: {query}
        """
        
        try:
            # Make LLM call to generate Cypher query
            response = ollama.generate(model="llama3.1", prompt=prompt)
            cypher_query = response["response"].strip()
            
            # Execute the Cypher query
            results = self.db_manager.execute_query(cypher_query)
            
            return {
                "action": "retrieve",
                "query": query,
                "cypher_query": cypher_query,
                "results": results,
                "agent": self.name
            }
        except Exception as e:
            logger.error(f"Failed to retrieve data: {e}")
            # Fallback to simulated response
            return {
                "action": "retrieve",
                "query": query,
                "cypher_query": "MATCH (n) RETURN n LIMIT 5",
                "results": [
                    {"name": "Sample Entity 1", "type": "Concept", "description": "Sample description"},
                    {"name": "Sample Entity 2", "type": "Person", "description": "Another sample description"}
                ],
                "agent": self.name,
                "error": str(e)
            }


class ExtractorAgent:
    """
    Agent responsible for extracting specific information from unstructured data
    and generating targeted queries for the knowledge graph.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the ExtractorAgent.
        
        Args:
            config: Configuration dictionary for the agent
        """
        self.config = config or {}
        self.name = "ExtractorAgent"
        self.description = "Extracts specific information and generates targeted queries"
        self.model = self.config.get("model", "llama3.1")
        
    async def execute(self, task: str, context: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Execute an extraction task based on the provided context.
        
        Args:
            task: The extraction task to perform
            context: The context to work with
            **kwargs: Additional parameters for the task
            
        Returns:
            Dictionary containing extraction results
        """
        logger.info("Executing extraction task with ExtractorAgent")
        
        # Create prompt for LLM to perform extraction
        prompt = f"""
        Task: {task}
        
        Context:
        {context}
        
        Please perform the requested task on the provided context. Return your response in a 
        structured format that is appropriate for the task.
        """
        
        try:
            # Make actual LLM call
            response = ollama.generate(model=self.model, prompt=prompt)
            extraction_result = response["response"]
            
            return {
                "task": task,
                "context": context,
                "result": extraction_result,
                "agent": self.name,
                "model_used": self.model
            }
        except Exception as e:
            logger.error(f"Failed to execute extraction task: {e}")
            # Fallback to simulated response
            return {
                "task": task,
                "context": context,
                "result": "Sample extraction result based on the task and context",
                "agent": self.name,
                "model_used": self.model,
                "error": str(e)
            }
