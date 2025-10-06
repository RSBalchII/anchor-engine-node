from rich.console import Console
from rich.prompt import Prompt

def main():
    """
    Main function to run the ECE terminal REPL.
    """
    console = Console()
    console.print("[bold green]External Context Engine (ECE) Terminal[/bold green]")
    console.print("Type 'exit' or 'quit' to end the session.")

    while True:
        try:
            prompt_text = "[bold cyan]ece>[/bold cyan] "
            command = Prompt.ask(prompt_text)

            if command.lower() in ["exit", "quit"]:
                console.print("[bold yellow]Exiting ECE Terminal. Goodbye![/bold yellow]")
                break

            # For now, just echo the command
            console.print(f"Executing: [italic]{command}[/italic]")
            # TODO: Add actual command processing logic here

        except KeyboardInterrupt:
            console.print("\n[bold yellow]Exiting ECE Terminal. Goodbye![/bold yellow]")
            break
        except Exception as e:
            console.print(f"[bold red]An error occurred: {e}[/bold red]")

if __name__ == "__main__":
    main()
