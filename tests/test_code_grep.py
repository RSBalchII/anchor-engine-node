import os
import tempfile
from pathlib import Path

from mcp.server import code_search


def test_code_search_with_context_and_glob():
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "test.txt"
        p.write_text("""
line1
target line2
line3
""".strip())
        res = code_search(root=tmp, query="target", regex=False, max_results=10, glob="*.txt", context=1)
        assert res.get("count", 0) >= 1
        r0 = res["results"][0]
        assert "matches" in r0
        assert r0["matches"][0]["line"] == 2
        assert "line1" in r0["matches"][0]["snippet"]