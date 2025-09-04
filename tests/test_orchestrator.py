# TASK-008: Update Orchestrator agent router
# TASK-009: Create agent configuration
import unittest
from unittest.mock import MagicMock, patch
from src.external_context_engine.orchestrator import Orchestrator
import asyncio

# Helper for async mocks
class AsyncMock(MagicMock):
    async def __call__(self, *args, **kwargs):
        return super().__call__(*args, **kwargs)

class TestOrchestrator(unittest.TestCase):

    def test_init_with_valid_config(self):
        config = {"decision_tree": [{"intent": "Default", "description": "Default intent", "action_plan": ["Do nothing"]}]}
        orchestrator = Orchestrator(config)
        self.assertIsNotNone(orchestrator.decision_tree)
        self.assertEqual(orchestrator.decision_tree[0]["intent"], "Default")

    def test_init_without_decision_tree_raises_error(self):
        config = {}
        with self.assertRaises(ValueError) as cm:
            Orchestrator(config)
        self.assertIn("Configuration must contain a 'decision_tree'.", str(cm.exception))

    async def test_run_default_intent(self):
        config = {"decision_tree": [{"intent": "Default", "description": "Default intent", "action_plan": ["Do nothing"]}]}
        orchestrator = Orchestrator(config)
        result = await orchestrator.run("Some random prompt", execute_agents=False)
        self.assertEqual(result["intent"], "Default")
        self.assertIn("Default intent", result["text_response"])

    async def test_run_matching_intent(self):
        config = {
            "decision_tree": [
                {"intent": "Default", "description": "Default intent", "action_plan": ["Do nothing"]},
                {"intent": "Search", "keywords": ["search", "find"], "description": "Search intent", "action_plan": ["Search the knowledge base"]}
            ]
        }
        orchestrator = Orchestrator(config)
        result = await orchestrator.run("Please search for something", execute_agents=False)
        self.assertEqual(result["intent"], "Search")
        self.assertIn("Search intent", result["text_response"])

    async def test_run_execute_agents(self):
        config = {"decision_tree": [{"intent": "Default", "description": "Default intent", "action_plan": ["Do nothing"]}]}
        orchestrator = Orchestrator(config)
        orchestrator._agent_factory = MagicMock()
        orchestrator._execute_agent_plan = AsyncMock(return_value="Agent executed result")

        result = await orchestrator.run("Some prompt", execute_agents=True)
        self.assertTrue(result["executed"])
        self.assertEqual(result["result"], "Agent executed result")
        orchestrator._execute_agent_plan.assert_called_once()

    
