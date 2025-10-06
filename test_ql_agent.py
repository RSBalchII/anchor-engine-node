import sys
import os

# Add the src directory to the path so we can import the agent
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def test_ql_agent_import():
    """Test that we can import the QLearningAgent without errors."""
    try:
        from external_context_engine.QLearningAgent import QLearningAgent
        print("SUCCESS: QLearningAgent imported correctly")
        return True
    except Exception as e:
        print(f"ERROR: Failed to import QLearningAgent: {e}")
        return False

if __name__ == "__main__":
    test_ql_agent_import()