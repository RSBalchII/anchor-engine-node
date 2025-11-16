from simple_tool_mode import SimpleToolIntent, SimpleToolHandler


class DummyMCP:
    async def call_tool(self, *args, **kwargs):
        return {}


class DummyLLM:
    async def generate(self, **kwargs):
        raise Exception("no llm")


def test_format_directly_shows_first_lines():
    handler = SimpleToolHandler(DummyMCP(), DummyLLM())
    intent = SimpleToolIntent("read_file", "file.txt", 0.9, "read file")
    result = {"content": "line1\nline2\nline3\nline4\n"}
    out = handler._format_directly(intent, result)
    assert "line1" in out and "line4" in out