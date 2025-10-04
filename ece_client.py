# ece_client.py

import httpx
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.prompt import Prompt
import configparser
import os
import json
import asyncio
import re


def get_orchestrator_url():
    """
    Get the Orchestrator URL from environment variables or a config file.
    """
    url = os.getenv('ECE_ORCHESTRATOR_URL')
    if url:
        return url
    
    config = configparser.ConfigParser()
    if os.path.exists('config.ini'):
        config.read('config.ini')
        if 'client' in config and 'orchestrator_url' in config['client']:
            return config['client']['orchestrator_url']
            
    return "http://localhost:8000/process_prompt"


async def poll_for_analysis_result(client, base_url, analysis_id):
    """
    Poll for analysis result with improved error handling and display.
    """
    console = Console()
    polling_url = f"{base_url}/get_analysis_result"
    polling_params = {"analysis_id": analysis_id}
    
    max_polls = 60  # Poll for a maximum of 2 minutes
    for i in range(max_polls):
        try:
            polling_response = await client.get(polling_url, params=polling_params)
            if polling_response.status_code == 200:
                polling_data = polling_response.json()
                status = polling_data.get("status")
                
                if status == "complete":
                    response_text = polling_data.get("response", "")
                    console.print(Panel("[bold green]Analysis Complete[/bold green]", expand=False))
                    # Try to parse as markdown if it looks like markdown
                    if response_text.startswith("#") or "**" in response_text or "*" in response_text:
                        console.print(Markdown(response_text))
                    else:
                        console.print(response_text)
                    return True
                elif status == "pending":
                    if i % 10 == 0:  # Show progress every 10 polls
                        console.print(f"[yellow]Analysis still pending... ({i}/{max_polls})[/yellow]")
                else:
                    console.print(f"[bold red]Unexpected status: {status}[/bold red]")
                    return False
            else:
                error_detail = await polling_response.aread()
                console.print(f"[bold red]HTTP Error while polling: {polling_response.status_code} - {error_detail.decode()}[/bold red]")
                return False
                
        except httpx.RequestError as e:
            console.print(f"[bold red]Connection Error while polling: {e}[/bold red]")
            return False
        except Exception as e:
            console.print(f"[bold red]Unexpected error while polling: {e}[/bold red]")
            return False
            
        await asyncio.sleep(2)
    
    console.print("[bold red]Analysis timed out after 2 minutes.[/bold red]")
    return False


async def main():
    """
    Main asynchronous function to run the ECE client.
    """
    orchestrator_url = get_orchestrator_url()
    base_url = orchestrator_url.replace("/process_prompt", "")
    console = Console()
    console.print(f"[bold green]Connecting to ECE Orchestrator at:[/bold green] {orchestrator_url}")
    console.print(Panel("[bold blue]ECE Client v1.0[/bold blue]\nType 'exit' or 'quit' to terminate the client.", expand=False))

    async with httpx.AsyncClient(timeout=None) as client:
        while True:
            try:
                prompt_text = Prompt.ask("[bold cyan]ECE>[/bold cyan]")
                
                if prompt_text.lower() in ['exit', 'quit']:
                    break
                
                if not prompt_text.strip():
                    continue

                params = {"prompt": prompt_text}
                
                console.print("n[italic yellow]Sending request to Orchestrator...[/italic yellow]")
                
                response = await client.get(orchestrator_url, params=params)
                if response.status_code != 200:
                    error_detail = await response.aread()
                    console.print(f"[bold red]HTTP Error: {response.status_code} - {error_detail.decode()}[/bold red]")
                    continue

                response_data = response.json()
                response_text = response_data.get("response", "")
                
                # Check if this is a complex reasoning task that returns an analysis ID
                analysis_match = re.search(r'[Aa]nalysis [Ii][Dd] is ([a-zA-Z0-9\-]+)', response_text)
                if analysis_match:
                    analysis_id = analysis_match.group(1)
                    console.print(f"[bold yellow]Complex reasoning task initiated with ID: {analysis_id}[/bold yellow]")
                    console.print("[italic yellow]Polling for results...[/italic yellow]\n")
                    
                    # Poll for the analysis result
                    await poll_for_analysis_result(client, base_url, analysis_id)
                else:
                    # Check if this is a prompt that should trigger parallel thinking
                    if "analyze" in prompt_text.lower():
                        console.print("[bold yellow]Analyzing prompt...[/bold yellow]")
                        console.print("[italic yellow]Running parallel thinkers and synthesizing results...[/italic yellow]\n")
                        # For analysis prompts, we want to ensure the output is displayed before allowing another prompt
                        console.print(Panel("[bold green]Analysis Result:[/bold green]", expand=False))
                        if response_text.startswith("#") or "**" in response_text or "*" in response_text:
                            console.print(Markdown(response_text))
                        else:
                            console.print(response_text)
                        # Add a small delay to ensure user sees the output before allowing another prompt
                        await asyncio.sleep(0.5)
                    else:
                        # Regular response - display directly
                        console.print(Panel("[bold green]Response from Orchestrator:[/bold green]", expand=False))
                        # Try to parse as markdown if it looks like markdown
                        if response_text.startswith("#") or "**" in response_text or "*" in response_text:
                            console.print(Markdown(response_text))
                        else:
                            console.print(response_text)

            except httpx.RequestError as e:
                console.print(f"n[bold red]Connection Error:[/bold red] Could not connect to the ECE Orchestrator. Please ensure the ECE is running.")
            except KeyboardInterrupt:
                break
            except Exception as e:
                console.print(f"n[bold red]An unexpected error occurred:[/bold red] {e}")
                console.print_exception()

    console.print("n[bold blue]ECE Client disconnected.[/bold blue]")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("nClient terminated.")