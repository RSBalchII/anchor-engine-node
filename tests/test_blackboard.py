import pytest
import json
from tools.blackboard import Blackboard

@pytest.fixture
def blackboard():
    bb = Blackboard()
    bb.clear()  # Ensure a clean state before each test
    yield bb
    bb.clear()  # Clean up after each test

def test_post_message_and_read_latest_messages(blackboard):
    source_agent = "TestAgent"
    content = "This is a test message."
    blackboard.post_message(source_agent, content)

    messages = blackboard.read_latest_messages(1)
    assert len(messages) == 1
    assert messages[0]["source_agent"] == source_agent
    assert messages[0]["content"] == content

def test_post_task(blackboard):
    queue_name = "scout_tasks"
    task_data = {"type": "web_scrape", "url": "http://example.com"}
    blackboard.post_task(queue_name, task_data)

    # For testing, we can directly access Redis to verify the task
    # In a real scenario, another agent would consume this task
    # This requires direct Redis access in the test, which might not be ideal
    # for pure unit tests, but for integration-like unit tests, it's acceptable.
    # For simplicity, we'll assume the task is pushed to the queue.
    # A more robust test would involve mocking Redis or consuming the task.
    # For now, we'll just check if the list exists and has one item.
    
    # Note: blpop removes the item, so we can't use lrange after it.
    # We'll use lrange to peek at the item without removing it.
    tasks_raw = blackboard.redis_client.lrange(queue_name, 0, 0)
    assert len(tasks_raw) == 1
    decoded_task = json.loads(tasks_raw[0].decode('utf-8'))
    assert decoded_task == task_data
