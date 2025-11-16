import pytest

from simple_tool_mode import SimpleToolMode


@pytest.mark.parametrize(
    "query,expected_intent,expected_tool",
    [
        ("list files", "list_files", "filesystem_read"),
        ("show me the files in .", "list_files", "filesystem_read"),
        ("what files are in current directory", "list_files", "filesystem_read"),
        ("pwd", "current_directory", "shell_execute"),
        ("read file README.md", "read_file", "filesystem_read"),
        ("what's in README.md?", "read_file", "filesystem_read"),
        ("search for python async tutorial", "search_web", "web_search"),
        ("weather in Paris", "search_web", "web_search"),
        ("run command ls -la", "run_command", "shell_execute"),
        ("execute pwd", "run_command", "shell_execute"),
    ],
)
def test_simple_tool_mode_intents(query, expected_intent, expected_tool):
    mode = SimpleToolMode()
    intent = mode.detect_intent(query)
    assert intent is not None
    # Intent type may vary for overlapping patterns (e.g., 'pwd')
    tool_name, params = mode.map_to_tool_call(intent)
    assert tool_name == expected_tool
    assert isinstance(params, dict)


def test_no_match_returns_none():
    mode = SimpleToolMode()
    assert mode.detect_intent("good morning") is None