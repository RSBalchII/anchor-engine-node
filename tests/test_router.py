import pytest

from simple_tool_mode import SimpleToolMode, SimpleToolHandler


def test_write_file_pattern_with_content():
    mode = SimpleToolMode()
    q = 'create file notes.txt with remember to buy milk'
    intent = mode.detect_intent(q)
    assert intent is not None
    assert intent.intent_type == 'write_file'
    assert isinstance(intent.target, dict)
    assert intent.target['path'] == 'notes.txt'
    assert 'remember to buy milk' in intent.target['content']


def test_code_search_pattern_root_and_query():
    mode = SimpleToolMode()
    q = 'search code for SimpleToolMode in ./anchor'
    intent = mode.detect_intent(q)
    assert intent is not None
    assert intent.intent_type == 'code_search'
    assert intent.target['query'] == 'SimpleToolMode'
    assert intent.target['root'] in ['./anchor', './anchor']


def test_heuristic_falls_back_to_code_search():
    handler = SimpleToolHandler(mcp_client=None, llm_client=None)
    q = 'grep tool_safety in code'
    intent = handler._heuristic_intent(q)
    assert intent is not None
    assert intent.intent_type == 'code_search'


def test_heuristic_run_command():
    handler = SimpleToolHandler(mcp_client=None, llm_client=None)
    q = 'git status'
    intent = handler._heuristic_intent(q)
    assert intent is not None
    assert intent.intent_type == 'run_command'