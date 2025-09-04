
# TASK-016: Create Q-Learning Agent class
# TASK-017: Implement Q-Table management
# TASK-018: Develop graph traversal algorithms
# TASK-019: Create training pipeline
# TASK-020: Add Q-Table update mechanism
# TASK-021: Implement path optimization
# TASK-022: Setup PyTorch with CUDA
# TASK-016: Create Q-Learning Agent class
# TASK-017: Implement Q-Table management
# TASK-018: Develop graph traversal algorithms
# TASK-019: Create training pipeline
# TASK-020: Add Q-Table update mechanism
# TASK-021: Implement path optimization
import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import asyncio
import numpy as np

from src.external_context_engine.memory_management.agents.q_learning_agent import QLearningGraphAgent, QTable
from src.external_context_engine.memory_management.neo4j_manager import Neo4jManager
from src.external_context_engine.memory_management.models import MemoryPath

class TestQLearningGraphAgent(unittest.TestCase):

    @patch('src.external_context_engine.memory_management.neo4j_manager.Neo4jManager')
    @patch('src.external_context_engine.memory_management.agents.q_learning_agent.QTable')
    def setUp(self, MockQTable, MockNeo4jManager):
        self.mock_graph_manager = MockNeo4jManager.return_value
        self.mock_q_table = MockQTable.return_value
        self.agent = QLearningGraphAgent(self.mock_graph_manager)

    def test_initialization(self):
        self.assertIsNotNone(self.agent.graph)
        self.assertIsNotNone(self.agent.q_table)
        self.assertEqual(self.agent.learning_rate, 0.1)
        self.assertEqual(self.agent.discount_factor, 0.9)
        self.assertEqual(self.agent.epsilon, 0.1)

    async def test_find_paths_exploratory(self):
        self.agent.epsilon = 1.0 # Force exploration
        start_node = {"name": "NodeA"}
        
        # Mock _get_neighbors to return a predictable sequence
        self.agent._get_neighbors = AsyncMock(side_effect=[
            [{"to_node": "NodeB", "type": "REL1"}, {"to_node": "NodeC", "type": "REL2"}], # Neighbors of NodeA
            [], # No neighbors for NodeB
            []  # No neighbors for NodeC
        ])
        
        # Mock _select_best_action to return a predictable choice
        self.agent._select_best_action = MagicMock(return_value={"to_node": "NodeB", "type": "REL1"})
        
        # Mock q_table.get_q_value
        self.mock_q_table.get_q_value.return_value = 0.5

        paths = await self.agent.find_paths([start_node], max_hops=2)
        self.assertIsInstance(paths, list)
        self.assertGreater(len(paths), 0)
        # Further assertions can be made on the structure and content of paths

    async def test_update_q_values(self):
        path = ["NodeA", "NodeB", "NodeC"]
        reward = 1.0
        
        self.mock_q_table.get_q_value.return_value = 0.5
        self.mock_q_table.get_max_q_value.return_value = 0.8
        
        await self.agent.update_q_values(path, reward)
        
        self.mock_q_table.update.assert_called()
        self.assertGreater(self.agent.episode_count, 0)

    async def test_train(self):
        training_data = [("NodeX", "NodeY", 0.5)]
        
        self.agent._find_shortest_path = AsyncMock(return_value=["NodeX", "NodeZ", "NodeY"])
        self.agent.update_q_values = AsyncMock()
        
        await self.agent.train(training_data)
        
        self.agent._find_shortest_path.assert_called_once_with("NodeX", "NodeY")
        self.agent.update_q_values.assert_called_once()

class TestQTable(unittest.TestCase):

    def setUp(self):
        self.persist_path = "./test_q_table.npy"
        if os.path.exists(self.persist_path):
            os.remove(self.persist_path)
        self.q_table = QTable(persist_path=self.persist_path)

    def tearDown(self):
        if os.path.exists(self.persist_path):
            os.remove(self.persist_path)

    def test_get_q_value(self):
        self.q_table.q_values["state1"]["action1"] = 0.5
        self.assertEqual(self.q_table.get_q_value("state1", "action1"), 0.5)
        self.assertEqual(self.q_table.get_q_value("state_nonexistent", "action_nonexistent"), 0.0)

    def test_get_max_q_value(self):
        self.q_table.q_values["state1"]["action1"] = 0.5
        self.q_table.q_values["state1"]["action2"] = 0.8
        self.assertEqual(self.q_table.get_max_q_value("state1"), 0.8)
        self.assertEqual(self.q_table.get_max_q_value("state_nonexistent"), 0.0)

    def test_update(self):
        self.q_table.update("state1", "action1", 0.7)
        self.assertEqual(self.q_table.q_values["state1"]["action1"], 0.7)

    async def test_save_and_load(self):
        self.q_table.update("state1", "action1", 0.9)
        await self.q_table.save()

        new_q_table = QTable(persist_path=self.persist_path)
        await new_q_table.load()
        self.assertEqual(new_q_table.get_q_value("state1", "action1"), 0.9)

if __name__ == '__main__':
    unittest.main()
