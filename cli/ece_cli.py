"""
ECE-CLI: External Context Engine Command-Line Interface

This module implements the command-line interface for interacting with the External Context Engine.
"""
import asyncio
import httpx
import json
import os
import click
from pathlib import Path
from rich.console import Console
from rich.markdown import Markdown
from rich.prompt import Prompt
from rich.panel import Panel
from pydantic import BaseModel, ValidationError
from typing import Optional


class ECEConfig(BaseModel):
    """Configuration model for ECE CLI"""
    ece_base_url: str = "http://localhost:8000"
    timeout: int = 30
    history_size: int = 100

    class Config:
        env_file = ".env"


class ECEAPIClient:
    """Client for communicating with the External Context Engine API"""
    
    def __init__(self, config: ECEConfig):
        self.config = config
        self.console = Console()
        
    async def health_check(self):
        """Check the health of the ECE orchestrator"""
        try:
            async with httpx.AsyncClient(timeout=self.config.timeout) as client:
                response = await client.get(f"{self.config.ece_base_url}/health")
                return response.status_code == 200, response.json()
        except Exception as e:
            return False, {"error": str(e)}
    
    async def process_prompt(self, prompt: str):
        """Send a prompt to the ECE and get response"""
        try:
            async with httpx.AsyncClient(timeout=self.config.timeout) as client:
                response = await client.get(
                    f"{self.config.ece_base_url}/process_prompt",
                    params={"prompt": prompt}
                )
                if response.status_code == 200:
                    return response.json()
                else:
                    return {"error": f"API returned status {response.status_code}: {response.text}"}
        except Exception as e:
            return {"error": str(e)}


class ECECLI:
    """Main CLI application for the External Context Engine"""
    
    def __init__(self):
        self.console = Console()
        self.config = self._load_config()
        self.api_client = ECEAPIClient(self.config)
        self.history_file = Path.home() / ".config" / "ece-cli" / "history.json"
        self.history = self._load_history()
    
    def _load_config(self) -> ECEConfig:
        """Load configuration from file or environment"""
        config_dir = Path.home() / ".config" / "ece-cli"
        config_dir.mkdir(parents=True, exist_ok=True)
        config_file = config_dir / "config.json"
        
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    config_data = json.load(f)
                return ECEConfig(**config_data)
            except (json.JSONDecodeError, ValidationError):
                pass
        
        # Return default config
        config = ECEConfig()
        
        # Save default config for future use
        with open(config_file, 'w') as f:
            json.dump(config.dict(), f, indent=2)
        
        return config
    
    def _load_history(self):
        """Load command history from file"""
        if self.history_file.exists():
            try:
                with open(self.history_file, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                return []
        return []
    
    def _save_history(self):
        """Save command history to file"""
        self.history_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.history_file, 'w') as f:
            json.dump(self.history[-self.config.history_size:], f)
    
    def _display_response(self, response: dict):
        """Display the response from ECE in a formatted way"""
        if "error" in response:
            self.console.print(f"[red]Error:[/red] {response['error']}")
            return
        
        if "response" in response:
            md = Markdown(response["response"])
            self.console.print(md)
        else:
            self.console.print_json(data=response)
    
    async def run(self):
        """Run the main CLI loop"""
        self.console.print(Panel("ECE-CLI: External Context Engine Command-Line Interface", expand=False))
        self.console.print("Type your prompts or use commands like /help, /config, /health, /exit")
        
        while True:
            try:
                user_input = Prompt.ask("[bold blue]ECE[/bold blue]").strip()
                
                if user_input.startswith('/'):
                    await self._handle_command(user_input)
                else:
                    self.history.append({"type": "prompt", "content": user_input})
                    self._save_history()
                    
                    with self.console.status("[bold green]Processing...[/bold green]"):
                        response = await self.api_client.process_prompt(user_input)
                    
                    self._display_response(response)
                    
            except KeyboardInterrupt:
                self.console.print("n[yellow]Use /exit to quit[/yellow]")
            except EOFError:
                self.console.print("n[red]Goodbye![/red]")
                break
    
    async def _handle_command(self, command: str):
        """Handle special commands"""
        if command in ['/exit', '/quit']:
            self.console.print("[red]Goodbye![/red]")
            exit(0)
        elif command == '/help':
            self.console.print(Panel(
                "[bold]Available Commands:[/bold]\n"
                "/help - Show this help message\n"
                "/config - Show current configuration\n"
                "/health - Check ECE orchestrator status\n"
                "/exit or /quit - Exit the CLI",
                title="Help"
            ))
        elif command == '/config':
            self.console.print(Panel(
                f"[bold]Configuration:[/bold]\n"
                f"ECE Base URL: {self.config.ece_base_url}\n"
                f"Timeout: {self.config.timeout}s\n"
                f"History Size: {self.config.history_size}",
                title="Current Configuration"
            ))
        elif command == '/health':
            with self.console.status("[bold green]Checking health...[/bold green]"):
                ok, result = await self.api_client.health_check()
            
            if ok:
                self.console.print("[green]✓ ECE Orchestrator is healthy[/green]")
            else:
                self.console.print(f"[red]✗ ECE Orchestrator error:[/red] {result}")
        else:
            self.console.print(f"[yellow]Unknown command: {command}[/yellow]")
            self.console.print("Type /help for available commands")


@click.command()
def main():
    """Main entry point for the ECE CLI"""
    cli = ECECLI()
    try:
        asyncio.run(cli.run())
    except KeyboardInterrupt:
        print("nGoodbye!")


if __name__ == "__main__":
    main()