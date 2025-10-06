# utils/db_manager.py
# This module handles the connection and interaction with the Neo4j database.

import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

class Neo4jManager:
    """
    A manager class to handle the connection and queries to a Neo4j database.
    """
    def __init__(self):
        """
        Initializes the driver by loading credentials from the .env file.
        """
        load_dotenv()
        uri = os.getenv("NEO4J_URI")
        user = os.getenv("NEO4J_USER")
        password = os.getenv("NEO4J_PASSWORD")

        if not all([uri, user, password]):
            raise ValueError("Neo4j credentials not found in .env file.")

        self._driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        """
        Closes the database connection.
        """
        if self._driver:
            self._driver.close()

    def execute_query(self, query, parameters=None):
        """
        Executes a Cypher query against the database.

        :param query: The Cypher query string.
        :param parameters: A dictionary of parameters for the query.
        :return: The result of the query.
        """
        with self._driver.session() as session:
            result = session.run(query, parameters)
            # De-nest the record objects into a list of dictionaries
            return [dict(record) for record in result]

    def get_schema(self):
        """
        Retrieves the database schema, including node labels and relationship types.
        This is used to provide context to the LLM for query generation.
        """
        with self._driver.session() as session:
            labels = [record["label"] for record in session.run("CALL db.labels()")]
            rel_types = [record["relationshipType"] for record in session.run("CALL db.relationshipTypes()")]
            return {"node_labels": labels, "relationship_types": rel_types}

# You can create a single instance to be imported by other modules
db_manager = Neo4jManager()