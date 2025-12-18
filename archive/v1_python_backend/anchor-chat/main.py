from textual.app import App, ComposeResult
from textual.containers import Container, VerticalScroll
from textual.widgets import Header, Footer, TextArea, Static, Markdown
from textual.messages import Message
from textual import work
import httpx
import asyncio
import json

# Configuration
ECE_URL = "http://127.0.0.1:8000"

class ChatBubble(Static):
    """A single message bubble in the chat."""
    def __init__(self, content: str, sender: str, **kwargs):
        super().__init__(**kwargs)
        self.content = content
        self.sender = sender
        self.styles.margin = (1, 0)
        self.styles.padding = (1, 2)
        
        if sender == "User":
            self.styles.background = "#2e3440"  # Dark gray/blue for user
            self.styles.align_horizontal = "right"
            self.border_title = "You"
        else:
            self.styles.background = "#3b4252"  # Slightly lighter for AI
            self.styles.align_horizontal = "left"
            self.border_title = "Coda"

    def compose(self) -> ComposeResult:
        yield Markdown(self.content)

    def update_content(self, new_content: str):
        self.content = new_content
        self.query_one(Markdown).update(self.content)

class AnchorChatApp(App):
    """A TUI for the Context-Engine."""
    
    CSS = """
    Screen {
        layout: grid;
        grid-size: 1 2;
        grid-rows: 1fr 12; /* Chat takes mostly everything, Input gets 12 lines */
    }

    #chat-history {
        height: 100%;
        border: solid green;
        background: $surface;
        padding: 1;
        overflow-y: scroll;
    }

    #input-area {
        height: 100%;
        border: solid blue;
        dock: bottom;
    }
    
    .system-msg {
        color: $text-muted;
        text-align: center;
        padding: 1;
    }
    """

    BINDINGS = [
        ("ctrl+q", "quit", "Quit"),
        ("ctrl+r", "reset_context", "Reset Context"),
        ("ctrl+s", "submit_message", "Send"),
    ]

    def compose(self) -> ComposeResult:
        """Create child widgets for the app."""
        yield Header(show_clock=True)
        
        # The scrollable history container
        with VerticalScroll(id="chat-history"):
            yield Static("Welcome to Anchor Chat. Connected to ECE Core.", classes="system-msg")

        # The input editor
        yield TextArea(id="input-area", language="markdown", show_line_numbers=False)
        
        yield Footer()

    def on_mount(self) -> None:
        """Focus input on startup."""
        self.query_one(TextArea).focus()

    @work(exclusive=True)
    async def action_reset_context(self) -> None:
        """Call the backend to clear the session context."""
        history = self.query_one("#chat-history")
        history.mount(Static("🔄 Resetting context...", classes="system-msg"))
        
        try:
            # We use a static session ID for this single-user TUI
            session_id = "anchor-tui-session"
            async with httpx.AsyncClient() as client:
                resp = await client.delete(f"{ECE_URL}/context/{session_id}")
                
            if resp.status_code == 200:
                history.mount(Static("✅ Context cleared. Starting fresh.", classes="system-msg"))
            else:
                history.mount(Static(f"❌ Error clearing context: {resp.text}", classes="system-msg"))
        except Exception as e:
            history.mount(Static(f"❌ Connection error: {e}", classes="system-msg"))
            
        history.scroll_end(animate=False)

    async def action_submit_message(self) -> None:
        """Handle message submission."""
        input_widget = self.query_one(TextArea)
        message = input_widget.text.strip()
        
        if not message:
            return

        # Clear input immediately
        input_widget.text = ""
        
        # Add User Bubble
        history = self.query_one("#chat-history")
        await history.mount(ChatBubble(message, "User"))
        history.scroll_end(animate=False)

        # Create placeholder for AI response
        ai_bubble = ChatBubble("...", "Coda")
        await history.mount(ai_bubble)
        history.scroll_end(animate=False)

        # Trigger background response task
        self.get_response(message, ai_bubble)

    @work(exclusive=True)
    async def get_response(self, message: str, bubble: ChatBubble) -> None:
        """Get response from ECE Core and update the bubble."""
        session_id = "anchor-tui-session"
        
        try:
            # Update bubble to show thinking state
            self.call_from_thread(bubble.update_content, "🤔 Thinking... (SGR Planning)")
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{ECE_URL}/chat/", 
                    json={"session_id": session_id, "message": message}
                )
                
                if response.status_code != 200:
                    self.call_from_thread(bubble.update_content, f"❌ Error: HTTP {response.status_code}\n{response.text}")
                    return

                data = response.json()
                final_response = data.get("response", "")
                
                # Update UI on the main thread
                self.call_from_thread(bubble.update_content, final_response)
                self.call_from_thread(self.query_one("#chat-history").scroll_end, animate=False)
                                
        except Exception as e:
            self.call_from_thread(bubble.update_content, f"❌ Connection Error: {e}")


if __name__ == "__main__":
    app = AnchorChatApp()
    app.run()
