import pytest

from simple_tool_mode import SimpleToolMode


def test_router_extracts_glob_and_context_for_grep():
    mode = SimpleToolMode()
    q = 'grep SimpleToolMode in ./anchor with glob *.py and context 3'
    intent = mode.detect_intent(q)
    assert intent is not None
    assert intent.intent_type in ['code_grep', 'code_search']
    params_intent = intent.target if isinstance(intent.target, dict) else {}
    assert params_intent.get('glob') == '*.py'
    assert params_intent.get('context') == 3