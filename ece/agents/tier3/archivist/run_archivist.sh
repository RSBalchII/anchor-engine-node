#!/bin/bash
# Script to run the Archivist agent with the correct PYTHONPATH

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Set the project root directory (one level up from the script directory)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Run the Archivist agent with the correct PYTHONPATH
PYTHONPATH="$PROJECT_ROOT" python3 "$SCRIPT_DIR/archivist_agent.py"