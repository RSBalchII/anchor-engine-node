# Simple Tool Mode Trigger Specs

Intent detection and mapping is implemented in `simple_tool_mode.py`.

Patterns (high-confidence):
- `list_files` (`simple_tool_mode.py:45–51`): phrases like "list/show/display files", "what files are in …", "show me the files", including flexible variants capturing a target path.
- `current_directory` (`:53–58`): queries about the current folder (e.g., "pwd", "what directory am I in").
- `read_file` (`:60–62`): "read/cat/show/open <file>" and "what's in <file>".
- `search_web` (`:64–71`): "search/google/find/lookup", question forms ("what is …"), weather patterns, conversational requests.
- `run_command` (`:73–76`): "run <command>", "execute <command>".

Target cleaning (`:111–167`):
- Strips fillers (e.g., "the", "in"); default to `.` for ambiguous list queries; normalizes quotes for files and commands; trims conversational words for web queries.

Tool mapping (`:169–195`):
- `list_files` → `filesystem_read(path)`
- `current_directory` → `shell_execute(command="pwd"|"cd")`
- `read_file` → `filesystem_read(path)`
- `search_web` → `web_search(query, max_results=5)`
- `run_command` → `shell_execute(command)`

Notes:
- Overlapping patterns may route equivalent queries (e.g., "pwd") to `current_directory` or `run_command`; mapping remains deterministic to the same MCP tool.
- Structured logs are emitted on match and result to support telemetry and future tuning.