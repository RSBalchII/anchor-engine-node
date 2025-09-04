# TASK-001: Setup Neo4j database with Docker
# TASK-013: Create graph stats endpoint
# TASK-041: Optimize Cypher queries
import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from src.external_context_engine.memory_management.neo4j_manager import Neo4jManager
from src.external_context_engine.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
import asyncio

class TestNeo4jManager(unittest.TestCase):

    @patch('src.external_context_engine.memory_management.neo4j_manager.GraphDatabase.driver')
    def setUp(self, MockGraphDatabaseDriver):
        self.mock_driver_constructor = MockGraphDatabaseDriver
        self.mock_driver = MagicMock()
        self.mock_driver_constructor.return_value = self.mock_driver
        self.mock_session = MagicMock()
        self.mock_driver.session.return_value.__enter__.return_value = self.mock_session
        self.manager = Neo4jManager(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)

    def test_connect(self):
        self.mock_driver_constructor.assert_called_once_with(
            NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)
        )
        self.assertEqual(self.manager.driver, self.mock_driver)

    def test_close(self):
        self.manager.close()
        self.mock_driver.close.assert_called_once()

    async def test_execute_query(self):
        test_query = "MATCH (n) RETURN n"
        test_params = {"param1": "value1"}
        mock_result = MagicMock()
        self.mock_session.run.return_value.data.return_value = [mock_result]

        result = await self.manager.execute_query(test_query, test_params)
        self.mock_session.run.assert_called_once_with(test_query, test_params)
        self.assertEqual(result, [mock_result])

    async def test_store_data(self):
        structured_data = {"nodes": [{"name": "Node1", "labels": ["Label1"]}], "relationships": []}
        mock_result = MagicMock()
        self.mock_session.run.return_value.data.return_value = [mock_result]

        result = await self.manager.store_data(structured_data)
        self.mock_session.run.assert_called_once() # More specific assertions can be added based on implementation
        self.assertEqual(result, [mock_result])

    async def test_find_relevant_nodes(self):
        embedding = [0.1, 0.2, 0.3]
        mock_result = MagicMock()
        self.mock_session.run.return_value.data.return_value = [mock_result]

        result = await self.manager.find_relevant_nodes(embedding)
        self.mock_session.run.assert_called_once() # More specific assertions can be added based on implementation
        self.assertEqual(result, [mock_result])

    