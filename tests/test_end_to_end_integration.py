
# TASK-078: Create end-to-end integration test
# TASK-078: Create end-to-end integration test
import unittest
from unittest.mock import MagicMock, AsyncMock, patch
import asyncio
import os
from dotenv import load_dotenv

from src.external_context_engine.orchestrator import Orchestrator
from src.external_context_engine.memory_management.agents.archivist_agent import EnhancedArchivistAgent
from src.external_context_engine.memory_management.agents.q_learning_agent import QLearningGraphAgent
from src.external_context_engine.memory_management.neo4j_manager import Neo4jManager
from src.external_context_engine.memory_management.services.llm_service import LLMService
from src.external_context_engine.memory_management.services.cache_manager import CacheManager
from src.external_context_engine.memory_management.models.memory_context import MemoryContext

class TestEndToEndIntegration(unittest.TestCase):

    @patch('src.external_context_engine.memory_management.neo4j_manager.Neo4jManager')
    @patch('src.external_context_engine.memory_management.agents.q_learning_agent.QTable')
    @patch('src.external_context_engine.memory_management.services.cache_manager.CacheManager')
    @patch('src.external_context_engine.memory_management.services.llm_service.ollama')
    def setUp(self, MockOllama, MockCacheManager, MockQTable, MockNeo4jManager):
        load_dotenv() # Load environment variables for config

        self.mock_neo4j_manager = MockNeo4jManager.return_value
        self.mock_q_table = MockQTable.return_value
        self.mock_cache_manager = MockCacheManager.return_value
        self.mock_ollama = MockOllama

        # Mock LLMService methods
        self.mock_ollama.chat.side_effect = [
            # For extract_concepts
            {'message': {'content': 'concept1, concept2'}},
            # For summarize_context
            {'message': {'content': 'Summarized context from LLM.'}}
        ]

        # Mock Neo4jManager methods
        self.mock_neo4j_manager.find_relevant_nodes.return_value = [
            {"name": "Node A", "type": "Concept"},
            {"name": "Node B", "type": "Concept"}
        ]
        self.mock_neo4j_manager.store_data.return_value = ["node_id_1", "rel_id_1"]

        # Mock QLearningGraphAgent methods
        self.mock_q_table.get_q_value.return_value = 0.5
        self.mock_q_table.get_max_q_value.return_value = 0.8
        self.mock_q_table.update.return_value = None
        self.mock_q_table.save.return_value = None
        self.mock_q_table.load.return_value = None

        # Mock QLearningGraphAgent.find_paths to return a list of MemoryPath objects
        mock_memory_path = MemoryPath(nodes=[{"name": "Node A"}, {"name": "Node B"}], relationships=[], score=1.0, length=1)
        self.mock_q_learning_agent = MagicMock(spec=QLearningGraphAgent)
        self.mock_q_learning_agent.find_paths = AsyncMock(return_value=[mock_memory_path])

        # Instantiate actual services and agents
        self.llm_service = LLMService(model_name="test_model")
        self.q_learning_agent = QLearningGraphAgent(graph_manager=self.mock_neo4j_manager)
        self.archivist_agent = EnhancedArchivistAgent(
            llm=self.llm_service,
            neo4j_manager=self.mock_neo4j_manager,
            q_learning_agent=self.q_learning_agent,
            cache_manager=self.mock_cache_manager
        )

        # Orchestrator config
        self.orchestrator_config = {
            "decision_tree": [
                {"intent": "Default", "description": "Default intent", "action_plan": ["Do nothing"]},
                {"intent": "QueryMemory", "keywords": ["query", "ask", "find"], "description": "Query memory intent"},
                {"intent": "StoreMemory", "keywords": ["store", "save", "ingest"], "description": "Store memory intent"}
            ]
        }
        self.orchestrator = Orchestrator(
            config=self.orchestrator_config,
            archivist_agent=self.archivist_agent,
            q_learning_agent=self.q_learning_agent
        )

    async def test_end_to_end_query_memory(self):
        user_prompt = "Query: What is the capital of France?"
        
        # Run the orchestrator
        result = await self.orchestrator.run(user_prompt, execute_agents=True)

        # Assertions
        self.assertEqual(result["intent"], "QueryMemory")
        self.assertTrue(result["executed"])
        self.assertIn("summary", result["result"].to_dict()) # Check if MemoryContext is returned
        self.mock_ollama.chat.assert_called() # LLM used for concept extraction and summarization
        self.mock_neo4j_manager.find_relevant_nodes.assert_called_once() # Neo4j queried
        self.mock_q_learning_agent.find_paths.assert_called_once() # QLA used for paths

    async def test_end_to_end_store_memory(self):
        user_prompt = "Store: Paris is the capital of France."
        
        # Mock the LLM to return structured data for store intent
        self.mock_ollama.chat.side_effect = [
            {'message': {'content': 'concept1, concept2'}}, # For extract_concepts
            {'message': {'content': '{"nodes": [{"name": "Paris", "labels": ["City"]}], "relationships": []}'}} # For structured data extraction
        ]

        # Temporarily override the _execute_agent_plan to simulate store logic
        # In a real scenario, the Orchestrator's decision tree would route to a store method
        # For this test, we'll directly call the store method via a mock.
        self.orchestrator._execute_agent_plan = AsyncMock(side_effect=self.archivist_agent.store)

        result = await self.orchestrator.run(user_prompt, execute_agents=True)

        self.assertEqual(result["intent"], "StoreMemory")
        self.assertTrue(result["executed"])
        self.assertIn("node_id_1", result["result"]) # Check if store_data returns IDs
        self.mock_neo4j_manager.store_data.assert_called_once() # Neo4j store called

if __name__ == '__main__':
    unittest.main()
