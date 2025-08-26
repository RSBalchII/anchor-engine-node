import pytest
from unittest.mock import patch, MagicMock
import builtins
import io

# Import the functions from ark_main.py that we need to test or mock
from ark_main import run_ark, process_user_request, run_strategist_synthesis, call_ollama
from config import STRATEGIST_MODEL, LOCUS_MODEL, MAIN_CONTEXT_FILE

# Mock the append_to_file function to prevent actual file writes during tests
@pytest.fixture(autouse=True)
def mock_append_to_file():
    with patch('ark_main.append_to_file') as mock_func:
        yield mock_func

# Mock the Blackboard to prevent Redis interactions during tests
@pytest.fixture(autouse=True)
def mock_blackboard():
    with patch('ark_main.blackboard') as mock_bb:
        mock_bb.read_latest_messages.return_value = [] # Ensure no messages by default
        yield mock_bb

# Mock the AgentOrchestrator to prevent background threads from starting
@pytest.fixture(autouse=True)
def mock_orchestrator():
    with patch('ark_main.AgentOrchestrator') as mock_orch_class:
        mock_instance = MagicMock()
        mock_orch_class.return_value = mock_instance
        yield mock_instance

# Mock the DistillerAgent to prevent its crew orchestration
@pytest.fixture(autouse=True)
def mock_distiller_agent():
    with patch('ark_main.DistillerAgent') as mock_dist_class:
        mock_instance = MagicMock()
        mock_dist_class.return_value = mock_instance
        yield mock_instance

@patch('ark_main.call_ollama')
def test_end_to_end_strategist_synthesis(mock_call_ollama, mock_append_to_file, mock_blackboard, mock_orchestrator, mock_distiller_agent):
    # Configure the mock for call_ollama
    # For the strategist model, return a predefined objective
    mock_call_ollama.side_effect = [
        # First call (SYNTHESIZER_MODEL in process_user_request for simple query)
        "Hello Rob, how can I help you today?",
        # Second call (STRATEGIST_MODEL in run_strategist_synthesis)
        "Objective: Analyze user input."
    ]

    # Simulate user input
    user_input = "hello"

    # Mock builtins.input to provide the user input
    with patch('builtins.input', side_effect=[user_input, 'exit']):
        # Mock builtins.print to capture output (optional, for debugging)
        with patch('builtins.print') as mock_print:
            # Run the main loop
            run_ark()

            # Assert that call_ollama was called with the strategist model and a relevant prompt
            # We need to check the *last* call to call_ollama, which should be for the strategist
            # The exact prompt content might vary, so we check for keywords
            strategist_call_args, strategist_call_kwargs = mock_call_ollama.call_args_list[-1]
            
            assert strategist_call_kwargs['model_name'] == STRATEGIST_MODEL
            assert "Given the following agent reports" in strategist_call_kwargs['prompt']
            assert "synthesize the current situation" in strategist_call_kwargs['prompt']
            assert "define the next single priority objective" in strategist_call_ollama.call_args[1]['prompt']

            # Optionally, assert that the final response was printed (if needed for debugging)
            # mock_print.assert_any_call("\n--- Strategist's Objective ---")
            # mock_print.assert_any_call("Objective: Analyze user input.")
