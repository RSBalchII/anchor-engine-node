"""
Anchor - Lightweight Terminal CLI for ECE_Core
Personal cognitive command center (Copilot CLI style)
"""
import httpx
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
    ):
        self.ece_url = ece_url or os.getenv("ECE_URL", "http://localhost:8000")
        self.session_id = session_id or os.getenv("SESSION_ID", "anchor-session")
        self.api_key = os.getenv("ECE_API_KEY")
        timeout_val = timeout or int(os.getenv("ECE_TIMEOUT", "300"))
        
        # Set up headers with API key if configured
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        self.client = httpx.AsyncClient(timeout=timeout_val, headers=headers)
        self.running = True
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 3
        
        # Set up key bindings for multiline support
        kb = KeyBindings()
        
        @kb.add('escape', 'enter')
        def _(event):
            """Alt+Enter to insert newline, Enter to submit"""
            event.current_buffer.insert_text('\n')
        
        self.prompt_session = PromptSession(
            key_bindings=kb,
            enable_history_search=True,
            auto_suggest=AutoSuggestFromHistory(),
            multiline=False,  # Explicitly set to false, paste bracketing enabled by default
            enable_suspend=False  # Prevent Ctrl+Z issues
        )
        
        # MCP server process (embedded tool server)
        self.mcp_process = None
        self.mcp_port = 8008
        
        # Simple tool mode (pattern-based tool execution for small models)
        self.simple_mode = SimpleToolMode()
        self.simple_handler = None  # Initialized after MCP server starts
        
    def start_mcp_server(self):
        """Start embedded MCP server for tools"""
        mcp_script = Path(__file__).parent / "mcp" / "server.py"
        
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
        try:
            # Sanitize message to remove surrogate characters
            message = message.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
            
            payload = {
                "session_id": self.session_id,
                "message": message
            }
            
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
                            elif data.get("done"):
                                break
                            elif data.get("error"):
                                yield f"\n❌ {data['error']}\n"
                                break
                        except json.JSONDecodeError:
                            continue
        except asyncio.CancelledError:
            # Gracefully handle cancellation (e.g., from pasting multiline text)
            logger.debug("Stream cancelled")
            yield "\n⚠️  Response cancelled\n"
        except asyncio.TimeoutError:
            logger.error("Request timed out")
            yield "\n⏱️  Request timed out\n"
        except httpx.ConnectError:
            logger.error("Connection lost to ECE_Core")
            yield "\n❌ Connection lost to ECE_Core. Attempting to reconnect...\n"
            self.reconnect_attempts += 1
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"\n❌ Error: {type(e).__name__}: {str(e)}\n"
    
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
            yield "⏱️  Request timed out"
        except httpx.ConnectError:
            logger.error("Connection lost during fallback")
            yield "❌ Connection lost to ECE_Core"
        except Exception as e:
            logger.error(f"Fallback error: {e}")
            yield f"❌ Error: {type(e).__name__}: {str(e)}"
    
    def print_header(self):
        """Print header once on startup."""
        print("\n" + "="*60)
        print("  Anchor - Personal Cognitive Command Center")
        print("  Memory-Enhanced Terminal AI with MCP Tools")
        print("="*60)
        print("  Type /help for commands, /exit to quit")
        if self.simple_handler:
            print("  🚀 Simple Mode: ON (pattern-based tool execution)")
        print("  Tools: filesystem, shell, websearch (auto-enabled)")
        print()
    
    
    async def run(self):
        """Main CLI loop."""
        # Start embedded MCP server
        self.start_mcp_server()
        
        # Check connection with retry
        for attempt in range(self.max_reconnect_attempts):
            connected = await self.check_connection()
            if connected:
                break
            if attempt < self.max_reconnect_attempts - 1:
                print(f"⏳ Retrying connection (attempt {attempt + 2}/{self.max_reconnect_attempts})...")
                await asyncio.sleep(2)
        
        if not connected:
            print("❌ ECE_Core not running. Start it first:")
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
                        print(f"\n⏳ Reconnecting to ECE_Core...")
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
                        cmd = user_input[1:].lower()
                        
                        if cmd in ["exit", "quit"]:
                            print("\n👋 Goodbye!\n")
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
                                print("\n🔧 Debug mode: OFF\n")
                            else:
                                logging.getLogger().setLevel(logging.DEBUG)
                                print("\n🔧 Debug mode: ON\n")
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
                        else:
                            print(f"\n⚠️  Unknown command: /{cmd}")
                            print("   Type /help for available commands\n")
                            continue
                    
                    # Legacy command support (without slash)
                    if user_input.lower() in ["exit", "quit", "help", "clear"]:
                        if user_input.lower() in ["exit", "quit"]:
                            print("\n👋 Goodbye!\n")
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
                
                except KeyboardInterrupt:
                    print("\n\n👋 Goodbye!\n")
                    break
                except EOFError:
                    print("\n\n👋 Goodbye!\n")
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
        try:
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


async def main():
    """Entry point."""
    cli = AnchorCLI()
    await cli.run()


if __name__ == "__main__":
    asyncio.run(main())

