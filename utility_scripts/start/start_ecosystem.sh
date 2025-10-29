#!/bin/bash

# Shell script to start the ECE ecosystem: Redis, Neo4j, and all ECE agents
# With on-demand model management via ModelManager
# This is a wrapper that delegates to the Python start_ecosystem.py script

# Change to project root directory
cd "$(dirname "$0")/../" || exit 1

# Delegate to the Python script with all arguments passed through
python3 start_ecosystem.py "$@"