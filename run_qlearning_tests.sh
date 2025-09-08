#!/bin/bash

# Test runner for QLearningAgent

echo "Running QLearningAgent tests..."

# Run unit tests
echo "Running unit tests..."
python -m pytest tests/qlearning_agent/test_qlearning_agent.py -v

# Run integration tests
echo "Running integration tests..."
python -m pytest tests/qlearning_agent/test_integration.py -v

echo "All tests completed!"