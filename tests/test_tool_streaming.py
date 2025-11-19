import os
import sys
import asyncio
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'anchor'))

from anchor.main import AnchorCLI


def test_streaming_trigger_calls_plugin(monkeypatch):
    # Ensure plugin discovery enabled to test plugin lookup
    monkeypatch.setenv('PLUGINS_ENABLED', 'true')
    cli = AnchorCLI(create_prompt=False)
    pm = cli.plugin_manager
    assert pm is not None
    pm.discover()

    executed = {'called': False, 'plugin_call': None, 'params': None}

    async def fake_execute(tool, **kwargs):
        executed['called'] = True
        executed['plugin_call'] = tool
        executed['params'] = kwargs
        return {'result': 'ok'}

    # Replace execute_tool with our fake
    pm.execute_tool = fake_execute

    # Simulate streaming chunks making up a TOOL_CALL
    chunks = ["Hello assistant. ", "TOOL_CA", "LL: filesystem_read(path=\".\") and some explanation"]
    loop = asyncio.get_event_loop()
    for chunk in chunks:
        loop.run_until_complete(cli._process_stream_chunk(chunk))

    assert executed['called'] is True
    assert 'filesystem_read' in executed['plugin_call']
    assert 'path' in executed['params']
