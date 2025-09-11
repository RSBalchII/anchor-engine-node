#!/usr/bin/env python3
"""
Demo script for the advanced reasoning workflows in ECE v2.0.

This script demonstrates both the Parallel Thinking and Exploratory Problem-Solving workflows.
"""

import sys
import os
from unittest.mock import patch, MagicMock

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from ece.agents.tier1.orchestrator.orchestrator_agent import OrchestratorAgent


def main():
    """Main entry point for the demo."""
    print("ECE v2.0 Advanced Reasoning Workflows Demo")
    print("=" * 45)
    
    # Mock the Redis connection to avoid dependency on external services
    with patch('redis.Redis') as mock_redis:
        mock_redis_instance = MagicMock()
        mock_redis_instance.ping.return_value = True
        mock_redis.return_value = mock_redis_instance
        
        # Initialize the orchestrator
        orchestrator = OrchestratorAgent()
        
        # Demo 1: Parallel Thinking
        print("\n1. Parallel Thinking Demo")
        print("-" * 25)
        prompt1 = "Analyze the pros and cons of remote work for software development teams"
        print(f"Prompt: {prompt1}")
        response1 = orchestrator.process_prompt(prompt1)
        print(f"Response:\n{response1}")
        
        # Demo 2: Exploratory Problem-Solving
        print("\n2. Exploratory Problem-Solving Demo")
        print("-" * 35)
        prompt2 = "Solve for x in the equation 3x + 7 = 22"
        print(f"Prompt: {prompt2}")
        response2 = orchestrator.process_prompt(prompt2)
        print(f"Response:\n{response2}")
        
        # Demo 3: Traditional Workflow (for comparison)
        print("\n3. Traditional Workflow Demo")
        print("-" * 29)
        prompt3 = "What is the capital of France?"
        print(f"Prompt: {prompt3}")
        response3 = orchestrator.process_prompt(prompt3)
        print(f"Response:\n{response3}")
    
    print("\nDemo completed!")


if __name__ == "__main__":
    main()
