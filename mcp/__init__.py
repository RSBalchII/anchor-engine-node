"""MCP (Model Context Protocol) package for Anchor.

This package has been archived and no longer contains active runtime code.
To restore MCP functionality, copy the archived module contents back from:
archive/removed_tool_protocols/mcp-utcp/anchor/mcp/
"""

import os

# The MCP package for Anchor is archived. In normal runtime contexts we raise an
# ImportError to indicate the module is intentionally disabled. However, for
# test environments we allow importing the archived package if the environment
# variable `ANCHOR_ALLOW_ARCHIVED_MCP_TESTS` is set (common in CI/test runners).
if os.environ.get("ANCHOR_ALLOW_ARCHIVED_MCP_TESTS", "false").lower() not in ("1", "true", "yes"):
	raise ImportError(
		"Anchor MCP package archived; see archive/removed_tool_protocols/mcp-utcp/anchor/mcp/"
	)
