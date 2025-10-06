
import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

class Neo4jManager:
    """
    Manages the connection and queries to the Neo4j database.
    """
    def __init__(self):
        """
        Initializes the Neo4jManager, loading credentials from environment variables.
        """
        load_dotenv()
        uri = os.getenv("NEO4J_URI")
        user = os.getenv("NEO4J_USERNAME")
        password = os.getenv("NEO4J_PASSWORD")

        if not all([uri, user, password]):
            raise ValueError("NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD must be set in the environment.")

        self._driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        """
        Closes the database driver connection.
        """
        if self._driver:
            self._driver.close()

    def execute_query(self, query, parameters=None):
        """
        Executes a Cypher query against the database.

        Args:
            query (str): The Cypher query to execute.
            parameters (dict, optional): Parameters to pass to the query. Defaults to None.

        Returns:
            list: A list of records from the query result.
        """
        with self._driver.session() as session:
            result = session.run(query, parameters)
            return [record for record in result]

    def create_node(self, label, properties):
        """
        Creates a new node in the graph.
        """
        query = f"CREATE (n:{label} $props) RETURN id(n) AS node_id"
        result = self.execute_query(query, parameters={'props': properties})
        return result[0]['node_id'] if result else None

    def create_relationship(self, start_node_id, end_node_id, rel_type, properties=None):
        """
        Creates a relationship between two nodes.
        """
        query = (
            "MATCH (a), (b) "
            "WHERE id(a) = $start_id AND id(b) = $end_id "
            f"CREATE (a)-[r:{rel_type} $props]->(b) "
            "RETURN id(r) AS rel_id"
        )
        props = properties or {}
        result = self.execute_query(query, parameters={'start_id': start_node_id, 'end_id': end_node_id, 'props': props})
        return result[0]['rel_id'] if result else None

    def create_graph_from_structure(self, graph_structure):
        """
        Creates a graph from a structured dictionary of nodes and relationships.
        This method is designed for efficient bulk insertion.

        Args:
            graph_structure (dict): A dictionary with 'nodes' and 'relationships' keys.
                                    Nodes should have a temporary 'id' for relationship mapping.
        """
        query = """
        UNWIND $nodes AS node_data
        CREATE (n)
        SET n = node_data.properties
        SET n.temp_id = node_data.id
        WITH COLLECT({temp_id: n.temp_id, db_id: id(n)}) AS node_map
        
        UNWIND $relationships AS rel_data
        MATCH (start_node), (end_node)
        WHERE start_node.temp_id = rel_data.start_node_id AND end_node.temp_id = rel_data.end_node_id
        CREATE (start_node)-[r:RELATIONSHIP]->(end_node)
        SET r = rel_data.properties
        
        RETURN node_map
        """
        # This is a simplified query. A real implementation would need to handle labels and rel types dynamically.
        # For now, this demonstrates the approach.
        
        nodes = graph_structure.get('nodes', [])
        relationships = graph_structure.get('relationships', [])

        # A more robust query construction is needed here.
        # This is a placeholder for the logic that would dynamically build the query.
        
        # For now, let's stick to a simple node creation loop to get things started.
        # The advanced UNWIND query requires more careful construction.
        
        temp_to_db_id_map = {}
        for node in nodes:
            db_id = self.create_node(node['label'], node['properties'])
            temp_to_db_id_map[node['id']] = db_id
            
        for rel in relationships:
            start_db_id = temp_to_db_id_map.get(rel['start_node_id'])
            end_db_id = temp_to_db_id_map.get(rel['end_node_id'])
            if start_db_id and end_db_id:
                self.create_relationship(start_db_id, end_db_id, rel['type'], rel['properties'])
        
        return temp_to_db_id_map
