import pytest
import threading
import json
import time
from agents.orchestrator import AgentOrchestrator
from agents.scout_agent import ScoutAgent
from tools.blackboard import Blackboard

# Fixture to provide a clean Blackboard for each test
@pytest.fixture
def clean_blackboard():
    bb = Blackboard()
    bb.clear()  # Clear blackboard before test
    yield bb
    bb.clear()  # Clear blackboard after test

def test_orchestrator_tasks_scout_agent(clean_blackboard):
    # Instantiate agents
    orchestrator = AgentOrchestrator()
    scout = ScoutAgent()
    blackboard = clean_blackboard

    # Ensure blackboard is clear before starting
    blackboard.clear()

    # Launch scout agent in a background daemon thread
    scout_thread = threading.Thread(target=scout.start_scouting, daemon=True)
    scout_thread.start()

    # Give the scout thread a moment to start up
    time.sleep(1)

    # Orchestrator posts a task for the scout
    orchestrator._run_cycle()

    # Wait for the result on the blackboard_stream
    # blpop returns a tuple (list_name, item)
    result = blackboard.redis_client.blpop('blackboard_stream', timeout=30) # Increased timeout for web scrape

    # Assert that a result was received
    assert result is not None, "No result received on blackboard_stream within timeout."

    # Decode the result and assert its content
    queue_name, result_data = result
    result_json = json.loads(result_data.decode('utf-8'))

    assert result_json['source_agent'] == 'ScoutAgent'
    assert "deeplearning.ai" in result_json['content'].lower() or "the batch" in result_json['content'].lower(), \
        f"Expected web scrape content not found in result: {result_json['content']}"
