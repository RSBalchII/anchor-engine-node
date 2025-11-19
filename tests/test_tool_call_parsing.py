import os
import sys
import json
import asyncio
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'anchor'))

from anchor.main import AnchorCLI
from plugins.manager import PluginManager


def test_parse_tool_call_json():
    cli = AnchorCLI(create_prompt=False)
    raw_tool = 'filesystem_read'
    params_str = '{"path": "."}'
    tool, params = cli._parse_tool_call(raw_tool, params_str)
    assert tool == raw_tool
    assert isinstance(params, dict)
    assert params['path'] == '.'


def test_parse_tool_call_kv():
    cli = AnchorCLI(create_prompt=False)
    raw_tool = 'filesystem_read'
    params_str = 'path=.'
    tool, params = cli._parse_tool_call(raw_tool, params_str)
    assert tool == raw_tool
    assert params['path'] == '.'


def test_parse_and_execute_example_plugin(tmp_path, monkeypatch):
    # Ensure plugins discoverable
    monkeypatch.setenv('PLUGINS_ENABLED', 'true')
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    cli = AnchorCLI(create_prompt=False)
    # Ensure plugin manager enables plugins
    pm = cli.plugin_manager
    assert pm is not None
    discovered = pm.discover()
    assert 'example_tools' in discovered

    # Create test folder and files
    base = tmp_path / 'test_root'
    base.mkdir()
    (base / 'a.txt').write_text('alpha')
    (base / 'b.txt').write_text('beta')

    # Parse a TOOL_CALL-like string
    raw_tool = 'filesystem_read'
    params_str = f'path="{str(base)}"'
    tool, params = cli._parse_tool_call(raw_tool, params_str)
    assert tool == raw_tool

    # Resolve plugin and execute
    plugin_name = pm.lookup_plugin_for_tool(tool)
    assert plugin_name == 'example_tools'
    plugin_call = f'{plugin_name}:{tool}'
    res = asyncio.get_event_loop().run_until_complete(pm.execute_tool(plugin_call, **params))
    assert 'type' in res
    assert res['type'] == 'directory'
    assert 'a.txt' in res['items'] or 'b.txt' in res['items']
