from tool_safety import get_safety_manager


def test_write_confirmation_includes_preview():
    safety = get_safety_manager()
    params = {"path": "notes.txt", "content": "hello world" * 30}
    prompt = safety.get_confirmation_prompt("filesystem_write", params)
    assert "Preview:" in prompt
    assert "Length:" in prompt
    assert "hello world" in prompt