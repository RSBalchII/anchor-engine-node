"""
Database Manager for Neo4j integration in the Injector Agent
"""
from typing import Dict, Any, List, Optional
import logging
from neo4j import GraphDatabase
import time
import random

logger = logging.getLogger(__name__)


class Neo4jManager:
    """
    Manager for Neo4j database operations specific to the Injector agent
    """
    
    def __init__(self, uri: str, user: str, password: str, max_retries: int = 3):
        """
        Initialize the Neo4jManager.
        
        Args:
            uri: Neo4j database URI
            user: Database username
            password: Database password
            max_retries: Maximum number of retry attempts for transient errors
        """
        self.uri = uri
        self.user = user
        self.password = password
        self.max_retries = max_retries
        self.driver = None
        logger.info(f"Neo4jManager initialized with URI: {uri}")
        
    def connect(self):
        """
        Establish connection to Neo4j database.
        """
        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            logger.info("Connected to Neo4j database")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j database: {e}")
            raise
            
    def disconnect(self):
        """
        Close connection to Neo4j database.
        """
        if self.driver:
            self.driver.close()
            logger.info("Disconnected from Neo4j database")
            
    def execute_query(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Execute a Cypher query against the Neo4j database with retry logic.
        
        Args:
            query: Cypher query string
            parameters: Query parameters
            
        Returns:
            List of records returned by the query
        """
        if not self.driver:
            raise Exception("Database not connected")
            
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                with self.driver.session() as session:
                    logger.debug(f"Executing query: {query[:100]}...")  # Log first 100 chars of query
                    if parameters:
                        logger.debug(f"Query parameters: {parameters}")
                    result = session.run(query, parameters or {})
                    return [record.data() for record in result]
            except Exception as e:
                last_exception = e
                # Check if this is a transient error that we should retry
                if self._is_transient_error(e) and attempt < self.max_retries:
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    logger.warning(f"Transient error occurred: {e}. Retrying in {wait_time:.2f} seconds (attempt {attempt + 1}/{self.max_retries})")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Failed to execute query after {attempt} attempts: {e}")
                    logger.error(f"Query: {query}")
                    logger.error(f"Parameters: {parameters}")
                    raise
                    
        # If we've exhausted all retries, raise the last exception
        raise last_exception
            
    def execute_transaction(self, queries: List[Dict[str, Any]]) -> bool:
        """
        Execute multiple Cypher queries within a single transaction with retry logic.
        
        Args:
            queries: List of dictionaries containing 'query' and 'parameters' keys
            
        Returns:
            True if transaction was successful, False otherwise
        """
        if not self.driver:
            raise Exception("Database not connected")
            
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                with self.driver.session() as session:
                    tx = session.begin_transaction()
                    try:
                        logger.info(f"Starting transaction with {len(queries)} queries")
                        for i, query_dict in enumerate(queries):
                            query = query_dict.get('query')
                            parameters = query_dict.get('parameters', {})
                            logger.debug(f"Executing query {i+1}/{len(queries)}: {query[:100]}...")  # Log first 100 chars
                            tx.run(query, parameters)
                        tx.commit()
                        logger.info(f"Transaction committed successfully with {len(queries)} queries")
                        return True
                    except Exception as e:
                        tx.rollback()
                        logger.error(f"Transaction failed and was rolled back: {e}")
                        raise
            except Exception as e:
                last_exception = e
                # Check if this is a transient error that we should retry
                if self._is_transient_error(e) and attempt < self.max_retries:
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    logger.warning(f"Transient error occurred: {e}. Retrying in {wait_time:.2f} seconds (attempt {attempt + 1}/{self.max_retries})")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Failed to execute transaction after {attempt} attempts: {e}")
                    raise
                    
        # If we've exhausted all retries, raise the last exception
        raise last_exception
        
    def _is_transient_error(self, error: Exception) -> bool:
        """
        Determine if an error is transient and should be retried.
        
        Args:
            error: The exception to check
            
        Returns:
            True if the error is transient, False otherwise
        """
        error_str = str(error).lower()
        
        # Common transient error patterns
        transient_patterns = [
            "connection reset",
            "connection refused",
            "timeout",
            "temporarily unavailable",
            "locked",
            "busy",
            "network"
        ]
        
        is_transient = any(pattern in error_str for pattern in transient_patterns)
        if is_transient:
            logger.debug(f"Identified transient error: {error}")
        return is_transient