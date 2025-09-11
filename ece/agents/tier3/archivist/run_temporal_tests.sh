#!/bin/bash
# Test runner for the Temporal Archivist Agent

echo "Running Temporal Scanning Integration Tests..."

# Navigate to the archivist directory
cd /home/rsbiiw/projects/External-Context-Engine/ece/agents/tier3/archivist

# Run the tests
python3 -m pytest test_temporal_scanning.py -v

echo "Tests completed."