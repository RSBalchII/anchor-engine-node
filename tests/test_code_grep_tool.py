import os
import tempfile
from pathlib import Path

from tools.code_tools import code_grep


def test_code_grep_counts_and_exclusions():
    with tempfile.TemporaryDirectory() as tmp:
        p1 = Path(tmp) / "a.py"
        p2 = Path(tmp) / "b.txt"
        p3 = Path(tmp) / "c.py"
        p1.write_text("alpha\nmatch here\nomega\n")
        p2.write_text("no match\n")
        p3.write_text("match here too\n")
        res = code_grep(root=tmp, query="match", glob="*.py", exclude_globs=["c.py"], context=1)
        assert res.get("files", 0) == 1
        assert res.get("total_matches", 0) >= 1
        first = res["results"][0]
        assert first["match_count"] >= 1