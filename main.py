"""
Anchor - Lightweight Terminal CLI for ECE_Core
Personal cognitive command center (Copilot CLI style)
"""
import httpx
import re
import shlex
import asyncio
import sys
import json
import logging
import os
import subprocess
import time
from typing import Optional
from pathlib import Path

from prompt_toolkit import PromptSession
from prompt_toolkit.patch_stdout import patch_stdout
from prompt_toolkit.auto_suggest import AutoSuggestFromHistory
from prompt_toolkit.key_binding import KeyBindings

# Simple tool mode for small models
try:
    from simple_tool_mode import SimpleToolMode, SimpleToolHandler
except ImportError:
    # When installed via pip install -e ., the module may not be in Python path
    # so we directly execute it to get the classes
    import sys
    from pathlib import Path
    import importlib.util

    # Add the directory containing the script to Python path
    script_dir = Path(__file__).parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))

    # Now try the import again
    from simple_tool_mode import SimpleToolMode, SimpleToolHandler

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.WARNING,  # Only show warnings/errors by default
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AnchorCLI:
    """Lightweight Copilot CLI-style interface for ECE_Core."""
    
    def __init__(
        self, 
        ece_url: Optional[str] = None,
        session_id: Optional[str] = None,
        timeout: Optional[int] = None
        , create_prompt: bool = True
    ):
        self.ece_url = ece_url or os.getenv("ECE_URL", "http://localhost:8000")
        self.session_id = session_id or os.getenv("SESSION_ID", "anchor-session")
        self.api_key = os.getenv("ECE_API_KEY")
        timeout_val = timeout or int(os.getenv("ECE_TIMEOUT", "120"))
        # default to a higher read timeout (long streaming responses need more time)
        self._timeout_seconds = float(timeout_val)
        # Set up headers with API key if configured
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        # Configure a robust httpx.Timeout: short connect; larger read/write timeouts
        client_timeout = httpx.Timeout(connect=5.0, read=self._timeout_seconds, write=self._timeout_seconds, pool=15.0)
        self.client = httpx.AsyncClient(timeout=client_timeout, headers=headers)
        self.running = True
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 3
        # Streaming retries (exponential backoff) - maximum number of attempts
        self.streaming_max_retries = int(os.getenv("ANCHOR_STREAM_MAX_RETRIES", "3"))
        
        # Set up key bindings for multiline support
        kb = KeyBindings()
        
        @kb.add('escape', 'enter')
        def _(event):
            """Alt+Enter to insert newline, Enter to submit"""
            event.current_buffer.insert_text('\n')
        
        if create_prompt:
            try:
                self.prompt_session = PromptSession(
                key_bindings=kb,
                enable_history_search=True,
                auto_suggest=AutoSuggestFromHistory(),
                multiline=False,  # Explicitly set to false, paste bracketing enabled by default
                enable_suspend=False  # Prevent Ctrl+Z issues
                )
            except Exception as e:
                # Handle terminal compatibility issues (e.g., when running in PowerShell/WSL)
                if "NoConsoleScreenBufferError" in str(type(e).__name__) or "xterm-256color" in str(e):
                    logger.warning(f"Console compatibility issue detected: {e}")
                    logger.warning("Falling back to basic input method")
                    # For Windows PowerShell compatibility, force stdout as the output
                    import sys
                    from prompt_toolkit.output import DummyOutput
                    # Create a minimal prompt session with a dummy output to avoid console issues
                    logger.warning("Using fallback terminal compatibility mode")
                    self.prompt_session = PromptSession(
                        output=DummyOutput(),  # Use dummy output to avoid console issues
                        key_bindings=kb,
                        enable_history_search=False,
                        auto_suggest=None,
                        multiline=False,
                        enable_suspend=False
                    )
                else:
                    # Re-raise if it's a different error
                    raise
        else:
            self.prompt_session = None
        
        # MCP server process (embedded tool server)
        self.mcp_process = None
        self.mcp_port = 8008
        
        # Simple tool mode (pattern-based tool execution for small models)
        self.simple_mode = SimpleToolMode()
        self.simple_handler = None  # Initialized after MCP server starts
        # Plugin manager (disabled by default - uses PLUGINS_ENABLED env var)
        # Import PluginManager dynamically so we can load from repo root when running from subdirs
        plugin_manager_cls = None
        try:
            from plugins.manager import PluginManager as plugin_manager_cls
        except Exception:
            # Try to add repo root to sys.path so imports resolve when launched from anchor/
            try:
                repo_root = Path(__file__).resolve().parent.parent
                sys.path.insert(0, str(repo_root))
                from plugins.manager import PluginManager as plugin_manager_cls
            except Exception:
                plugin_manager_cls = None

        if plugin_manager_cls:
            self.plugin_manager = plugin_manager_cls({})
        else:
            self.plugin_manager = None
        # Pre-compile tool call regex for quick parsing of 'TOOL_CALL: name(...)' patterns
        self._tool_call_re = re.compile(r"TOOL_CALL:\s*([A-Za-z0-9_:]+)\s*\((.*)\)", re.DOTALL)
        
    def start_plugins(self):
        """Start plugins via PluginManager (if enabled)."""
        if not self.plugin_manager:
            logger.debug("No plugin manager available")
            return False
        discovered = self.plugin_manager.discover()
        if discovered:
            logger.info(f"Loaded plugins: {', '.join(discovered)}")
            return True
        logger.debug("No plugins discovered or plugin manager disabled")
        return False

    def start_mcp_server(self):
        """Start embedded MCP server for tools"""
        mcp_dir = Path(__file__).parent / "mcp"
        mcp_script = mcp_dir / "server.py"

        # If the mcp directory contains an ARCHIVED marker, don't attempt to start
        if (mcp_dir / "ARCHIVED.md").exists():
            logger.warning("MCP modules are archived and not available. Skipping MCP startup")
            return False
        
        if not mcp_script.exists():
            logger.warning(f"MCP server not found at: {mcp_script}")
            logger.warning("Tool calling will be disabled")
            return False
        
        try:
            logger.info("Starting embedded MCP server...")
            self.mcp_process = subprocess.Popen(
                [sys.executable, str(mcp_script)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
            )
            time.sleep(2)  # Wait for server startup
            
            # Verify it's running
            if self.mcp_process.poll() is None:
                logger.info(f"✓ MCP server started (port {self.mcp_port})")
                logger.info("  Tools: filesystem_read, shell_execute, web_search")
                
                # Initialize simple tool handler
                # Note: We'll create a minimal MCP client for simple mode
                try:
                    # Prefer plugin manager shim for simple mode
                    if self.plugin_manager and self.plugin_manager.enabled:
                        class PluginMCPShim:
                            def __init__(self, pm):
                                self.pm = pm

                            async def call_tool(self, tool_name, **kwargs):
                                plugin_name = self.pm.lookup_plugin_for_tool(tool_name)
                                if plugin_name:
                                    res = await self.pm.execute_tool(f"{plugin_name}:{tool_name}", **kwargs)
                                    return {"status": "success", "result": res}
                                return {"status": "error", "error": f"Tool not found: {tool_name}"}

                            async def get_tools(self):
                                return self.pm.list_tools()

                        simple_mcp = PluginMCPShim(self.plugin_manager)
                    else:
                        from mcp.client import MCPClient
                        simple_mcp = MCPClient(f"http://localhost:{self.mcp_port}")
                    
                    # Create a minimal LLM client for formatting
                    class SimpleLLMClient:
                        def __init__(self, ece_url, headers):
                            self.ece_url = ece_url
                            self.headers = headers
                        
                        async def generate(self, prompt, system_prompt=None):
                            """Minimal LLM generation for formatting"""
                            import httpx
                            async with httpx.AsyncClient(timeout=30) as client:
                                payload = {
                                    "session_id": "simple-mode",
                                    "message": prompt
                                }
                                response = await client.post(
                                    f"{self.ece_url}/chat",
                                    json=payload,
                                    headers=self.headers
                                )
                                if response.status_code == 200:
                                    data = response.json()
                                    return data.get("response", "")
                                return ""
                    
                    simple_llm = SimpleLLMClient(self.ece_url, self.client.headers)
                    self.simple_handler = SimpleToolHandler(simple_mcp, simple_llm)
                    logger.info("  ✓ Simple tool mode enabled (pattern-based execution)")
                except Exception as e:
                    logger.warning(f"  Simple tool mode initialization failed: {e}")
                
                return True
            else:
                # Get error output
                _, stderr = self.mcp_process.communicate(timeout=1)
                error_msg = stderr.decode('utf-8', errors='ignore') if stderr else "Unknown error"
                logger.warning(f"MCP server failed to start: {error_msg}")
                return False
        except Exception as e:
            logger.error(f"Could not start MCP server: {e}")
            return False
    
    def stop_mcp_server(self):
        """Stop MCP server on exit"""
        if self.mcp_process and self.mcp_process.poll() is None:
            logger.info("Stopping MCP server...")
            self.mcp_process.terminate()
            try:
                self.mcp_process.wait(timeout=5)
                logger.info("✓ MCP server stopped")
            except subprocess.TimeoutExpired:
                self.mcp_process.kill()
                logger.warning("MCP server forcefully terminated")
        
    async def check_connection(self) -> bool:
        """Verify ECE_Core is running."""
        try:
            response = await self.client.get(f"{self.ece_url}/health")
            if response.status_code == 200:
                self.reconnect_attempts = 0  # Reset on success
                return True
            return False
        except httpx.ConnectError as e:
            logger.error(f"Cannot connect to ECE_Core at {self.ece_url}: {e}")
            return False
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    async def send_message_streaming(self, message: str):
        """Send message and stream response token-by-token. Falls back to regular endpoint if streaming not available."""
        # Use retry/backoff for streaming requests
        try:
            # Sanitize message to remove surrogate characters
            message = message.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')

            payload = {
                "session_id": self.session_id,
                "message": message
            }

            attempt = 0
            last_exc = None
            while attempt < self.streaming_max_retries:
                try:
                    # Try streaming first
                    async with self.client.stream(
                        "POST",
                        f"{self.ece_url}/chat/stream",
                        json=payload
                    ) as response:
                        if response.status_code == 404:
                            # Fallback to regular endpoint
                            async for chunk in self.send_message_fallback(message):
                                yield chunk
                            return

                        if response.status_code != 200:
                            yield f"Error: HTTP {response.status_code}"
                            return

                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                data_str = line[6:]
                                try:
                                    data = json.loads(data_str)
                                    if data.get("chunk"):
                                        # Sanitize chunk to prevent encoding errors
                                        chunk = data["chunk"]
                                        chunk = chunk.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
                                        yield chunk
                                        # Process chunk for TOOL_CALL streaming detection
                                        try:
                                            await self._process_stream_chunk(chunk)
                                        except Exception as e:
                                            logger.debug(f"Stream tool call processing error: {e}")
                                    elif data.get("done"):
                                        break
                                    elif data.get("error"):
                                        yield f"\n[ERROR] {data['error']}\n"
                                        break
                                except json.JSONDecodeError:
                                    continue
                        # If we reached here, the stream finished normally
                        return
                except (httpx.ReadTimeout, httpx.ReadError, httpx.ConnectError, asyncio.TimeoutError) as exc:
                    last_exc = exc
                    attempt += 1
                    if attempt >= self.streaming_max_retries:
                        logger.warning("Streaming failed after %d attempts: %s", attempt, exc)
                        break
                    backoff = 0.5 * (2 ** (attempt - 1))
                    logger.info("Streaming attempt %d failed, retrying after %.2fs: %s", attempt, backoff, exc)
                    await asyncio.sleep(backoff)
                    continue
            # If we got here without returning, that implies streaming failed in all attempts
            # and `last_exc` contains the last exception
            if last_exc is not None:
                # Fallback to non-streaming endpoint
                async for chunk in self.send_message_fallback(message):
                    yield chunk
                return
        except asyncio.CancelledError:
            # Gracefully handle cancellation (e.g., from pasting multiline text)
            logger.debug("Stream cancelled")
            yield "\n[WARN] Response cancelled\n"
        except asyncio.TimeoutError:
            logger.error("Request timed out")
            yield "\n[TIMEOUT] Request timed out\n"
        except httpx.ReadTimeout as e:
            logger.warning("Stream ReadTimeout: %s", e)
            # fallback to non-streaming
            async for chunk in self.send_message_fallback(message):
                yield chunk
            return
        except httpx.ConnectError:
            logger.error("Connection lost to ECE_Core")
            yield "\n[ERROR] Connection lost to ECE_Core. Attempting to reconnect...\n"
            self.reconnect_attempts += 1
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"\n[ERROR] {type(e).__name__}: {str(e)}\n"
    
    async def send_message_fallback(self, message: str):
        """Fallback to regular /chat endpoint."""
        try:
            payload = {
                "session_id": self.session_id,
                "message": message
            }
            response = await self.client.post(
                f"{self.ece_url}/chat",
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                yield data.get("response", "No response from ECE_Core")
            else:
                yield f"Error: HTTP {response.status_code} - {response.text[:100]}"
        except asyncio.TimeoutError:
            logger.error("Fallback request timed out")
            yield "[TIMEOUT] Request timed out"
        except httpx.ConnectError:
            logger.error("Connection lost during fallback")
            yield "[ERROR] Connection lost to ECE_Core"
        except Exception as e:
            logger.error(f"Fallback error: {e}")
            yield f"[ERROR] {type(e).__name__}: {str(e)}"

    async def _process_stream_chunk(self, chunk: str):
        """Process a streaming chunk and fire a plugin tool call if a TOOL_CALL pattern is found.

        This function accumulates chunks in an instance buffer until a complete TOOL_CALL
        pattern is found (balanced parentheses). When found, it executes the tool and logs output.
        """
        if not hasattr(self, '_stream_buffer'):
            self._stream_buffer = ''
        # Append chunk and keep buffer at reasonable size
        self._stream_buffer += chunk
        if len(self._stream_buffer) > 8192:
            # Trim older content
            self._stream_buffer = self._stream_buffer[-8192:]
        # Search for tools; find the first complete TOOL_CALL occurrence
        m = self._tool_call_re.search(self._stream_buffer)
        if not m:
            return
        # We need to ensure the parentheses are balanced; quick check
        start = m.start()
        end = m.end()
        # If regex matched, assume it's complete enough; extract tool and params
        tool_name_raw = m.group(1).strip()
        params_str = m.group(2).strip()
        parsed_tool_name, params = self._parse_tool_call(tool_name_raw, params_str)
        if ":" in parsed_tool_name:
            plugin_call = parsed_tool_name
        else:
            plugin_name = self.plugin_manager.lookup_plugin_for_tool(parsed_tool_name) if self.plugin_manager else None
            plugin_call = f"{plugin_name}:{parsed_tool_name}" if plugin_name else parsed_tool_name
        # Execute the tool and print the result
        try:
            if self.plugin_manager and self.plugin_manager.enabled:
                res = await self.plugin_manager.execute_tool(plugin_call, **params)
                try:
                    import json as _json
                    print('\n🔧 TOOL_CALL result:', _json.dumps(res, indent=2))
                except Exception:
                    print('\n🔧 TOOL_CALL result:', res)
        finally:
            # Remove the handled tool call from the buffer to avoid duplicate handling
            self._stream_buffer = self._stream_buffer[:start] + self._stream_buffer[end:]
    
    def print_header(self):
        """Print header once on startup."""
        print("\n" + "="*60)
        print("  Anchor - Personal Cognitive Command Center")
        print("  Memory-Enhanced Terminal AI with MCP Tools")
        print("="*60)
        print("  Type /help for commands, /exit to quit")
        if self.simple_handler:
            print("  [TOOL] Simple Mode: ON (pattern-based tool execution)")
        if self.plugin_manager and self.plugin_manager.enabled and len(self.plugin_manager.plugins) > 0:
            print(f"  Plugins: {', '.join(self.plugin_manager.plugins.keys())}")
        else:
            print("  Tools and Plugins: DISABLED")
        print()
    
    
    async def run(self):
        """Main CLI loop."""
        # Start plugin manager or embedded MCP server (if present)
        self.start_plugins()
        self.start_mcp_server()  # backward compatible: will no-op if archived
        
        # Check connection with retry
        for attempt in range(self.max_reconnect_attempts):
            connected = await self.check_connection()
            if connected:
                break
            if attempt < self.max_reconnect_attempts - 1:
                print(f"[WAIT] Retrying connection (attempt {attempt + 2}/{self.max_reconnect_attempts})...")
                await asyncio.sleep(2)
        
        if not connected:
            print("[ERROR] ECE_Core not running. Start it first:")
            print("   cd ECE_Core && python launcher.py")
            self.stop_mcp_server()  # Clean up MCP server
            await self.client.aclose()
            return
        
        self.print_header()
        
        try:
            while self.running:
                try:
                    # Check if we need to reconnect
                    if self.reconnect_attempts > 0 and self.reconnect_attempts < self.max_reconnect_attempts:
                        print(f"\n[WAIT] Reconnecting to ECE_Core...")
                        await asyncio.sleep(2)
                        connected = await self.check_connection()
                        if not connected:
                            self.reconnect_attempts += 1
                            continue
                    elif self.reconnect_attempts >= self.max_reconnect_attempts:
                        print("\n❌ Max reconnection attempts reached. Exiting.")
                        break
                    
                    # Get user input (supports multiline paste)
                    with patch_stdout():
                        user_input = await self.prompt_session.prompt_async(
                            "You: ",
                            enable_open_in_editor=False,
                            multiline=False  # Single line by default, Alt+Enter for newlines
                        )
                    user_input = user_input.strip()
                    
                    if not user_input:
                        continue
                    
                    # Handle commands (slash commands)
                    if user_input.startswith('/'):
                        parts = user_input[1:].strip().split(None, 1)
                        cmd = parts[0].lower()
                        cmd_rest = parts[1] if len(parts) > 1 else ""
                        
                        if cmd in ["exit", "quit"]:
                            print("\n[EXIT] Goodbye!\n")
                            break
                        elif cmd == "help":
                            self.print_help()
                            continue
                        elif cmd == "clear":
                            print("\033[2J\033[H")  # Clear terminal
                            self.print_header()
                            continue
                        elif cmd == "session":
                            self.show_session_info()
                            continue
                        elif cmd == "memories":
                            await self.show_recent_memories()
                            continue
                        elif cmd == "tools":
                            await self.show_tools()
                            continue
                        elif cmd == "debug":
                            # Toggle debug mode
                            current_level = logging.getLogger().level
                            if current_level == logging.DEBUG:
                                logging.getLogger().setLevel(logging.WARNING)
                                print("\n[DEBUG] Debug mode: OFF\n")
                            else:
                                logging.getLogger().setLevel(logging.DEBUG)
                                print("\n[DEBUG] Debug mode: ON\n")
                            continue
                        elif cmd == "simple":
                            # Toggle simple mode
                            if self.simple_handler:
                                # Disable by setting to None
                                old_handler = self.simple_handler
                                self.simple_handler = None
                                print("\n🚀 Simple Mode: OFF (using full LLM tool calling)\n")
                            else:
                                # Try to re-enable
                                try:
                                    # Prefer plugin manager shim for simple mode
                                    if self.plugin_manager and self.plugin_manager.enabled:
                                        # Create an MCP-like shim using plugin_manager
                                        class PluginMCPShim:
                                            def __init__(self, pm):
                                                self.pm = pm

                                            async def call_tool(self, tool_name, **kwargs):
                                                plugin_name = self.pm.lookup_plugin_for_tool(tool_name)
                                                if plugin_name:
                                                    res = await self.pm.execute_tool(f"{plugin_name}:{tool_name}", **kwargs)
                                                    return {"status": "success", "result": res}
                                                return {"status": "error", "error": f"Tool not found: {tool_name}"}

                                            async def get_tools(self):
                                                return self.pm.list_tools()

                                        simple_mcp = PluginMCPShim(self.plugin_manager)
                                    else:
                                        from mcp.client import MCPClient
                                        simple_mcp = MCPClient(f"http://localhost:{self.mcp_port}")
                                    
                                    class SimpleLLMClient:
                                        def __init__(self, ece_url, headers):
                                            self.ece_url = ece_url
                                            self.headers = headers
                                        
                                        async def generate(self, prompt, system_prompt=None):
                                            import httpx
                                            async with httpx.AsyncClient(timeout=30) as client:
                                                payload = {"session_id": "simple-mode", "message": prompt}
                                                response = await client.post(f"{self.ece_url}/chat", json=payload, headers=self.headers)
                                                if response.status_code == 200:
                                                    return response.json().get("response", "")
                                                return ""
                                    
                                    simple_llm = SimpleLLMClient(self.ece_url, self.client.headers)
                                    self.simple_handler = SimpleToolHandler(simple_mcp, simple_llm)
                                    print("\n🚀 Simple Mode: ON (pattern-based tool execution)\n")
                                except Exception as e:
                                    print(f"\n⚠️  Could not enable simple mode: {e}\n")
                            continue
                        elif cmd == "call":
                            # Manual plugin tool invocation: /call plugin:tool arg1=val1 arg2=val2
                            if not self.plugin_manager or not self.plugin_manager.enabled:
                                print("\n⚠️  Plugins disabled. Enable PLUGINS_ENABLED and restart Anchor to use plugin tools.\n")
                                continue
                            if not cmd_rest:
                                print("\n⚠️  Usage: /call plugin:tool key=value [more] or /call tool(key=value ...)\n")
                                continue
                            # If cmd_rest contains parentheses, use the same parsing we use for LLM outputs
                            try:
                                match = self._tool_call_re.search(cmd_rest)
                                if match:
                                    tool_name_raw = match.group(1).strip()
                                    params_str = match.group(2).strip()
                                else:
                                    # Expect 'plugin:tool key=value key2=value2'
                                    tokens = shlex.split(cmd_rest)
                                    tool_name_raw = tokens[0]
                                    params_str = ' '.join(tokens[1:]) if len(tokens) > 1 else ''
                                parsed_tool_name, params = self._parse_tool_call(tool_name_raw, params_str)
                                if ":" in parsed_tool_name:
                                    plugin_call = parsed_tool_name
                                else:
                                    plugin_name = self.plugin_manager.lookup_plugin_for_tool(parsed_tool_name)
                                    plugin_call = f"{plugin_name}:{parsed_tool_name}" if plugin_name else parsed_tool_name
                                print(f"\n[TOOL] Manual tool invocation: {plugin_call} {params}\n")
                                res = await self.plugin_manager.execute_tool(plugin_call, **params)
                                try:
                                    import json as _json
                                    print(_json.dumps(res, indent=2))
                                except Exception:
                                    print(res)
                            except Exception as e:
                                print(f"\n[WARN] Could not execute tool: {e}\n")
                            continue
                        else:
                            print(f"\n[WARN] Unknown command: /{cmd}")
                            print("   Type /help for available commands\n")
                            continue
                    
                    # Legacy command support (without slash)
                    if user_input.lower() in ["exit", "quit", "help", "clear"]:
                        if user_input.lower() in ["exit", "quit"]:
                            print("\n[EXIT] Goodbye!\n")
                            break
                        elif user_input.lower() == "help":
                            self.print_help()
                            continue
                        elif user_input.lower() == "clear":
                            print("\033[2J\033[H")
                            self.print_header()
                            continue
                    
                    # 🚀 SIMPLE TOOL MODE: Pattern-based tool execution
                    # Intercept simple tool queries and execute directly (bypass LLM complexity)
                    if self.simple_handler and self.simple_handler.can_handle_directly(user_input):
                        logger.info("🎯 Using simple tool mode (pattern-based)")
                        sys.stdout.write("Assistant: ")
                        sys.stdout.flush()
                        
                        try:
                            response = await self.simple_handler.handle_query(user_input, self.session_id)
                            if response:
                                # Simple mode handled it successfully
                                print(response)
                                print()
                                continue
                            else:
                                # Pattern matched but execution failed, fall through to normal mode
                                logger.debug("Simple mode couldn't handle, falling back to ECE_Core")
                        except Exception as e:
                            logger.error(f"Simple mode error: {e}")
                            # Fall through to normal mode
                    
                    # Send to ECE_Core with streaming
                    sys.stdout.write("Assistant: ")
                    sys.stdout.flush()
                    
                    full_response = ""
                    try:
                        async for chunk in self.send_message_streaming(user_input):
                            # Ensure chunk can be encoded to terminal encoding
                            try:
                                sys.stdout.write(chunk)
                                sys.stdout.flush()
                                full_response += chunk
                            except UnicodeEncodeError:
                                # Fallback: replace problematic characters
                                safe_chunk = chunk.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding)
                                sys.stdout.write(safe_chunk)
                                sys.stdout.flush()
                                full_response += safe_chunk
                    except asyncio.CancelledError:
                        # Handle cancellation gracefully
                        print("\n⚠️  Response cancelled")
                    
                    print("\n")

                    # If the assistant produced a TOOL_CALL, try executing it via the plugin manager.
                    if self.plugin_manager and self.plugin_manager.enabled:
                        try:
                            match = self._tool_call_re.search(full_response)
                            if match:
                                tool_name_raw = match.group(1).strip()
                                params_str = match.group(2).strip()
                                parsed_tool_name, params = self._parse_tool_call(tool_name_raw, params_str)
                                # If the tool name doesn't include a plugin prefix, resolve the owning plugin
                                if ":" in parsed_tool_name:
                                    plugin_call = parsed_tool_name
                                else:
                                    plugin_name = self.plugin_manager.lookup_plugin_for_tool(parsed_tool_name)
                                    plugin_call = f"{plugin_name}:{parsed_tool_name}" if plugin_name else parsed_tool_name

                                print(f"\n🔧 Invoking tool: {plugin_call} with params: {params}\n")
                                try:
                                    res = await self.plugin_manager.execute_tool(plugin_call, **params)
                                    try:
                                        import json as _json
                                        print(_json.dumps(res, indent=2))
                                    except Exception:
                                        print(res)
                                except Exception as e:
                                    print(f"⚠️  Tool call failed: {e}")
                        except Exception as e:
                            logger.debug(f"Tool call parsing/execution error: {e}")
                
                except KeyboardInterrupt:
                    print("\n\n[EXIT] Goodbye!\n")
                    break
                except EOFError:
                    print("\n\n[EXIT] Goodbye!\n")
                    break
        
        finally:
            # Clean shutdown
            self.stop_mcp_server()
            await self.client.aclose()
    
    def print_help(self):
        """Print help text."""
        print("""
Commands:
  /exit, /quit  - Exit Anchor
  /clear        - Clear terminal
  /help         - Show this help
  /session      - Show current session info
  /memories     - Show recent memories
  /tools        - List available tools
  /debug        - Toggle debug mode
  /simple       - Toggle simple tool mode (pattern-based execution)

Input:
  • Enter          - Submit message
  • Alt+Enter      - Insert newline (for multiline input)
  • Ctrl+C         - Cancel/Exit
  • Paste          - Multiline paste is preserved

Tips:
  • Use arrow keys for command history (Unix/Linux/Mac)
  • Long responses are streamed in real-time
  • Terminal integration via MCP tools (filesystem, shell, web_search)
  • Tools execute automatically when needed
""")
    
    def show_session_info(self):
        """Show current session information."""
        print(f"\n📊 Session Information:")
        print(f"   Session ID: {self.session_id}")
        print(f"   ECE_Core: {self.ece_url}")
        print(f"   MCP Server: Port {self.mcp_port} ({'Running' if self.mcp_process and self.mcp_process.poll() is None else 'Stopped'})")
        print()
    
    async def show_recent_memories(self):
        """Show recent memories from ECE_Core."""
        try:
            # Try the `search` endpoint (supported by ECE_Core) for recent memories.
            response = await self.client.get(f"{self.ece_url}/memories/search?limit=5")
            # Backcompat: if server uses /memories with a 405, try the older endpoint
            if response.status_code == 405:
                response = await self.client.get(f"{self.ece_url}/memories?limit=5")
            if response.status_code == 200:
                memories = response.json().get('memories', [])
                print(f"\n💭 Recent Memories ({len(memories)}):")
                for i, mem in enumerate(memories, 1):
                    print(f"   {i}. {mem.get('content', 'N/A')[:60]}...")
                print()
            else:
                print("\n⚠️  Could not retrieve memories")
        except Exception as e:
            print(f"\n⚠️  Error retrieving memories: {e}")
    
    async def show_tools(self):
        """Show available MCP tools."""
        # Prefer plugin manager tools, otherwise the MCP server
        try:
            if self.plugin_manager and self.plugin_manager.enabled:
                tools = self.plugin_manager.list_tools()
                print(f"\n🔧 Available Plugin Tools ({len(tools)}):")
                for tool in tools:
                    print(f"   • {tool.get('name')}: {tool.get('description')}")
                print()
                return
            # Fallback to local MCP server (if present)
            response = await self.client.get(f"http://localhost:{self.mcp_port}/mcp/tools")
            if response.status_code == 200:
                tools_data = response.json()
                tools = tools_data.get('tools', [])
                print(f"\n🔧 Available Tools ({len(tools)}):")
                for tool in tools:
                    print(f"   • {tool['name']}: {tool['description']}")
                print()
            else:
                print("\n⚠️  Could not retrieve tools")
        except Exception as e:
            print(f"\n⚠️  Error retrieving tools: {e}")

    def _parse_tool_call(self, raw_tool_name: str, params_str: str):
        """Parse a TOOL_CALL invocation string.

        - raw_tool_name: a string like 'filesystem_list_directory' or 'utcp:filesystem_list_directory'
        - params_str: the contents inside the parentheses, either JSON or a comma-separated key=value list
        Returns: (tool_name, params_dict)
        """
        params = {}
        s = params_str.strip()
        if not s:
            return raw_tool_name, params
        # Try JSON parsing first
        try:
            if s.startswith("{"):
                import json
                params = json.loads(s)
                return raw_tool_name, params
        except Exception:
            pass

        # Fallback: parse key=value pairs using shlex
        try:
            tokens = shlex.split(params_str)
        except Exception:
            tokens = [t.strip() for t in params_str.split(',') if t.strip()]

        for tok in tokens:
            if '=' in tok:
                k, v = tok.split('=', 1)
                k = k.strip()
                v = v.strip()
                if (v.startswith("'") and v.endswith("'")) or (v.startswith('"') and v.endswith('"')):
                    v = v[1:-1]
                # booleans
                if v.lower() in ("true", "false"):
                    v2 = v.lower() == 'true'
                else:
                    try:
                        if '.' in v:
                            v2 = float(v)
                        else:
                            v2 = int(v)
                    except Exception:
                        v2 = v
                params[k] = v2
        return raw_tool_name, params


async def main():
    """Entry point."""
    cli = AnchorCLI()
    await cli.run()


def main_sync():
    """Synchronous entry point for console script."""
    asyncio.run(main())


if __name__ == "__main__":
    asyncio.run(main())

