#!/usr/bin/env python3
"""
Git commit message hook to enforce presence of a TASK ID (e.g., TASK-001).
Usage (pre-commit config): runs as a commit-msg hook with the path to the commit message file.
"""
import re
import sys
from pathlib import Path

TASK_RE = re.compile(r"TASK-\d{3,}")

def main() -> int:
    if len(sys.argv) < 2:
        print("[commit-msg] missing commit message file path", file=sys.stderr)
        return 1
    msg_path = Path(sys.argv[1])
    text = msg_path.read_text(encoding="utf-8")
    if not TASK_RE.search(text):
        print("[commit-msg] ERROR: Commit message must include a TASK ID (e.g., TASK-001).", file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

