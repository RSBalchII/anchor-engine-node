# src/main.py
# Main entrypoint for the Chimaera External Context Engine (ECE).

from dotenv import load_dotenv
load_dotenv() # Load environment variables from .env

import yaml
from utu.agents.orchestra_agent import OrchestraAgent # <-- CORRECTED IMPORT

def main():
    """
    Loads the agent configuration, initializes the OrchestraAgent,
    and starts an interactive user session.
    """
    print("🚀 Initializing Chimaera ECE...")

    try:
        with open('config.yaml', 'r') as f:
            config = yaml.safe_load(f)
        print("✅ Configuration loaded successfully.")
    except FileNotFoundError:
        # Adjusted path for src-layout
        with open('../config.yaml', 'r') as f:
            config = yaml.safe_load(f)
        print("✅ Configuration loaded successfully from root.")
    except Exception as e:
        print(f"❌ ERROR: Could not load or parse config.yaml: {e}")
        return

    # Initialize the main OrchestraAgent.
    # The framework uses the config and environment variables we set.
    try:
        orchestrator = OrchestraAgent(agent_name="OrchestraAgent", config=config)
        print("✅ OrchestraAgent initialized.")
        print("\n--- Coda D-003 is online. How can I assist you? ---")
    except Exception as e:
        print(f"❌ ERROR: Failed to initialize the OrchestraAgent: {e}")
        return

    # Start the interactive loop
    try:
        while True:
            user_input = input("\nArchitect > ")
            if user_input.lower() in ["quit", "exit"]:
                print("\n--- Coda D-003 shutting down. ---")
                break
            
            response = orchestrator.run(user_input)
            print(f"\nCoda > {response}")

    except KeyboardInterrupt:
        print("\n\n--- Session interrupted by user. Coda D-003 shutting down. ---")
    except Exception as e:
        print(f"\n❌ An unexpected error occurred during the session: {e}")

if __name__ == "__main__":
    main()