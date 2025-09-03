# src/main.py
# Main entrypoint for the Chimaera External Context Engine (ECE).

from dotenv import load_dotenv
load_dotenv() # Load environment variables from .env

import yaml
import os
from orchestrator import Orchestrator # <-- MODIFIED IMPORT

def find_config_path():
    """Finds the correct path for config.yaml."""
    # Path when running from project root
    if os.path.exists('config.yaml'):
        return 'config.yaml'
    # Path when running from src/external_context_engine
    elif os.path.exists('../../../config.yaml'):
        return '../../../config.yaml'
    else:
        return None

def main():
    """
    Loads the agent configuration, initializes the Orchestrator,
    and starts an interactive user session.
    """
    print("🚀 Initializing Chimaera ECE...")

    config_path = find_config_path()
    if not config_path:
        print(f"❌ ERROR: Could not find config.yaml.")
        return
        
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        print(f"✅ Configuration loaded successfully from {config_path}.")
    except Exception as e:
        print(f"❌ ERROR: Could not load or parse config.yaml: {e}")
        return

    # Initialize the main Orchestrator.
    try:
        # MODIFIED INSTANTIATION
        orchestrator = Orchestrator(config=config['OrchestraAgent'])
        print("✅ Orchestrator initialized.")
        print("\n--- Coda C-001 is online. How can I assist you? ---")
    except Exception as e:
        print(f"❌ ERROR: Failed to initialize the Orchestrator: {e}")
        return

    # Start the interactive loop
    try:
        while True:
            user_input = input("\nArchitect > ")
            if user_input.lower() in ["quit", "exit"]:
                print("\n--- Coda C-001 shutting down. ---")
                break
            
            response = orchestrator.run(user_input)
            print(f"\nCoda > {response}")

    except KeyboardInterrupt:
        print("\n\n--- Session interrupted by user. Coda C-001 shutting down. ---")
    except Exception as e:
        print(f"\n❌ An unexpected error occurred during the session: {e}")

if __name__ == "__main__":
    main()
