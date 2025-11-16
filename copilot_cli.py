#!/usr/bin/env python3
"""
Copilot CLI - Lightweight terminal overlay for ECE_Core
Mimics GitHub Copilot CLI behavior: lightweight, fast, non-intrusive.
"""
import httpx
import asyncio
import sys
import json
from datetime import datetime
from typing import Optional

try:
    import readline  # Unix/Linux/Mac - enables arrow keys and history
except ImportError:
    pass  # Windows - readline not available, but input() still works fine

class CopilotCLI:
    """Lightweight Copilot CLI-style interface for ECE_Core."""
    
    def __init__(self, ece_url: str = "http://localhost:8000", session_id: str = "copilot-cli"):
        self.ece_url = ece_url
        self.session_id = session_id
        self.client = httpx.AsyncClient(timeout=300.0)  # 5 min timeout for long responses
        self.running = True
        
    async def check_connection(self) -> bool:
        """Verify ECE_Core is running."""
        try:
            response = await self.client.get(f"{self.ece_url}/health")
            return response.status_code == 200
        except Exception as e:
            print(f"❌ Cannot connect to ECE_Core: {e}")
            return False
    
    async def send_message_streaming(self, message: str):
        """Send message and stream response token-by-token. Falls back to regular endpoint if streaming not available."""
        try:
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
                    yield f"Error: {response.status_code}"
                    return
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        try:
                            data = json.loads(data_str)
                            if data.get("chunk"):
                                yield data["chunk"]
                            elif data.get("done"):
                                break
                            elif data.get("error"):
                                yield f"\n❌ {data['error']}\n"
                                break
                        except json.JSONDecodeError:
                            continue
        except asyncio.TimeoutError:
            yield "\n⏱️  Request timed out (60s limit)\n"
        except Exception as e:
            yield f"\n❌ Error: {str(e)}\n"
    
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
            yield "⏱️  Request timed out (5 min limit)"
        except Exception as e:
            yield f"❌ Error: {type(e).__name__}: {str(e)}"
    
    def print_header(self):
        """Print header once on startup."""
        print("\n" + "="*60)
        print("  ECE_Core - Copilot CLI")
        print("="*60)
        print("  Type your message (Ctrl+C to quit, 'help' for commands)\n")
    
    def print_prompt(self):
        """Print user prompt."""
        sys.stdout.write("You: ")
        sys.stdout.flush()
    
    async def run(self):
        """Main CLI loop."""
        # Check connection
        connected = await self.check_connection()
        if not connected:
            print("❌ ECE_Core not running. Start it first:")
            print("   python launcher.py")
            await self.client.aclose()
            return
        
        self.print_header()
        
        try:
            while self.running:
                try:
                    # Get user input
                    self.print_prompt()
                    user_input = input().strip()
                    
                    if not user_input:
                        continue
                    
                    # Handle commands
                    if user_input.lower() == "exit" or user_input.lower() == "quit":
                        print("\n👋 Goodbye!\n")
                        break
                    
                    if user_input.lower() == "help":
                        self.print_help()
                        continue
                    
                    if user_input.lower() == "clear":
                        print("\033[2J\033[H")  # Clear terminal
                        self.print_header()
                        continue
                    
                    # Send to ECE_Core with streaming
                    sys.stdout.write("Assistant: ")
                    sys.stdout.flush()
                    
                    full_response = ""
                    async for chunk in self.send_message_streaming(user_input):
                        sys.stdout.write(chunk)
                        sys.stdout.flush()
                        full_response += chunk
                    
                    print("\n")
                
                except KeyboardInterrupt:
                    print("\n\n👋 Goodbye!\n")
                    break
                except EOFError:
                    print("\n\n👋 Goodbye!\n")
                    break
        
        finally:
            await self.client.aclose()
    
    def print_help(self):
        """Print help text."""
        print("""
Commands:
  exit, quit    - Exit the CLI
  clear         - Clear terminal
  help          - Show this help

Tips:
  • Use arrow keys for command history
  • Long responses will be truncated (use context management in ECE_Core)
  • Terminal integration via MCP tools (filesystem, shell, web_search)
""")


async def main():
    """Entry point."""
    cli = CopilotCLI()
    await cli.run()


if __name__ == "__main__":
    asyncio.run(main())
