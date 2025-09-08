#!/bin/bash
# Script to run all tests for the Distiller agent

echo "Running Distiller agent tests..."

# Set the Python path to include the distiller agent directory
export PYTHONPATH=/home/rsbiiw/projects/External-Context-Engine/ece/agents/tier3/distiller

# Run the tests
python3 -m pytest tests/distiller/test_distiller_agent.py -v

echo "Tests completed."