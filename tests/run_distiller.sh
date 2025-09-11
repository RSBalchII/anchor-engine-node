#!/bin/bash
# Script to run the Distiller agent

echo "Starting Distiller agent..."

# Check if scheduled mode is requested
if [ "$1" == "--scheduled" ]; then
    echo "Running in scheduled mode..."
    python3 /home/rsbiiw/projects/External-Context-Engine/ece/agents/tier3/distiller/distiller_agent.py --scheduled
else
    echo "Running in single execution mode..."
    python3 /home/rsbiiw/projects/External-Context-Engine/ece/agents/tier3/distiller/distiller_agent.py
fi

echo "Distiller agent finished."