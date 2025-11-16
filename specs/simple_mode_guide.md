````markdown
# Simple Mode Guide

This file consolidates `SIMPLE_MODE_GUIDE.md`, `SIMPLE_MODE_QUICKREF.md`, and other quick reference docs into an authoritative guide under `specs/`.

## Overview
Simple Tool Mode is a pattern-based execution system that makes small models reliably use tools.

## Usage
- Toggle with `/simple` to enable/disable.
- Debug with `/debug`.

## Patterns and Mapping
- Filesystem commands: `list files`, `show files`, `read <file>` map to `filesystem_read`.
- Web search: `search for`, `what is` map to `web_search`.
- Shell: `run command` maps to `shell_execute` (dangerous: requires confirmation).

## Quick Reference
A condensed guide for users to quickly reference supported commands and usage patterns.

### Filesystem
Commands: `list files`, `show files in .`, `ls`, `dir`, `read README.md`, `cat file.txt`, `show me package.json`, `what's in config.yaml?`

### Web Search
Commands: `search for python async`, `what is the weather in Paris?`, `how do I use asyncio?`, `tell me about machine learning`

### Shell
Commands: `run command pwd`, `execute ls -la` (dangerous: confirmation required)

### Toggle Simple Mode
Use `/simple` to toggle on/off. Use `/debug` to view pattern matching and mapping.

### Debugging
When in debug mode, pattern matches and direct execution messages will show:
```
You: /debug
You: list files
🎯 Pattern matched: list_files → '.'
🔧 Direct execution: filesystem_read({'path': '.'})
```

### When to Use Full LLM Mode
Disable simple mode (`/simple`) when:
- Queries are too complex for patterns
- Need multi-step tool chains
- Using 14B+ model that handles tool calls well
- Want the model to decide which tool to use


## Testing
Refer to `simple_mode_tests.md` for pattern tests and quick usage checks.

````
