````markdown
# Simple Mode Tests

This file consolidates test instructions from `TEST_SIMPLE_MODE.md` and `READY_TO_TEST.md`.

## Quick Tests
- Start the LLM, ECE_Core, and Anchor.
- Ensure header shows `Simple Mode: ON`.
- Run sample queries: `list files`, `read README.md`, `search for async python`.

## Debugging Tests
- Toggle `/debug` and test pattern matching for sample inputs.
- Check quick pattern tests by running `python simple_tool_mode.py`.

## Performance
- Expect <2s responses for pattern-based tool executions.

````
