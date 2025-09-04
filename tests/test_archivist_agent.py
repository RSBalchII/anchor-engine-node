# TASK-006: Enhance Archivist Agent core
# TASK-007: Integrate LLM into agents
# TASK-010: Create memory API models
# TASK-011: Implement memory query endpoint
# TASK-012: Implement memory store endpoint
# TASK-014: Setup WebSocket infrastructure
# TASK-015: Implement batch operations endpoint
import unittest
from unittest.mock import patch, MagicMock
from src.external_context_engine.memory_management.agents.archivist_agent import EnhancedArchivistAgent
from src.external_context_engine.memory_management.neo4j_manager import Neo4jManager
from src.external_context_engine.memory_management.agents.q_learning_agent import QLearningGraphAgent
from src.external_context_engine.memory_management.services.cache_manager import CacheManager
import asyncio

class TestArchivistAgent(unittest.TestCase):

    @patch('src.external_context_engine.memory_management.neo4j_manager.Neo4jManager')
    @patch('src.external_context_engine.memory_management.agents.q_learning_agent.QLearningGraphAgent')
    @patch('src.external_context_engine.memory_management.services.cache_manager.CacheManager')
    def setUp(self, MockCacheManager, MockQLearningGraphAgent, MockNeo4jManager):
        self.mock_llm = MagicMock()
        self.mock_neo4j_manager = MockNeo4jManager.return_value
        self.mock_q_learning_agent = MockQLearningGraphAgent.return_value
        self.mock_cache_manager = MockCacheManager.return_value
        self.agent = EnhancedArchivistAgent(
            llm=self.mock_llm,
            neo4j_manager=self.mock_neo4j_manager,
            q_learning_agent=self.mock_q_learning_agent,
            cache_manager=self.mock_cache_manager
        )

    def test_init_instantiates_dependencies(self):
        self.assertIsNotNone(self.agent.llm)
        self.assertEqual(self.agent.graph_db, self.mock_neo4j_manager)
        self.assertEqual(self.agent.qla, self.mock_q_learning_agent)
        self.assertEqual(self.agent.cache, self.mock_cache_manager)

    def test_process_query(self):
        async def run_test():
            query = "What is the capital of France?"
            # Mock the internal calls within process_query
            self.mock_llm.return_value = "parsed_concepts"
            self.mock_neo4j_manager.find_relevant_nodes.return_value = ["node1", "node2"]
            self.mock_q_learning_agent.find_paths.return_value = ["path1", "path2"]
            self.mock_llm.summarize_context.return_value = "summarized_context"

            result = await self.agent.process_query(query)
            self.assertEqual(result, "summarized_context")
            self.mock_llm.assert_called_once_with(query) # This mock is for the LLM parsing step
            self.mock_neo4j_manager.find_relevant_nodes.assert_called_once()
            self.mock_q_learning_agent.find_paths.assert_called_once()
            self.mock_llm.summarize_context.assert_called_once()

        asyncio.run(run_test())

    def test_store(self):
        async def run_test():
            structured_data = {"entity": "Paris", "type": "City"}
            expected_result = {"nodes_created": 1, "relationships_created": 0}
            self.mock_neo4j_manager.store_data.return_value = expected_result

            result = await self.agent.store(structured_data)
            self.assertEqual(result, expected_result)
            self.mock_neo4j_manager.store_data.assert_called_once_with(structured_data)

        asyncio.run(run_test())


    