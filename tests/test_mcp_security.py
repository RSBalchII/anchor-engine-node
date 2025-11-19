"""
MCP security tests moved to archive.
If you need to run these tests, restore the MCP modules from:
    archive/removed_tool_protocols/mcp-utcp/anchor/mcp/
"""

import pytest

def test_archived_marker():
    # When MCP is archived, this test ensures we don't accidentally run the old suite.
    assert True
