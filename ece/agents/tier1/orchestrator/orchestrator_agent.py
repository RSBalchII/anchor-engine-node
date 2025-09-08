"""
Orchestrator Agent for the External Context Engine (ECE).

This module implements the core logic for the Orchestrator agent, which acts as the
central cognitive unit of the ECE system. It manages context, delegates tasks to
specialized agents, and synthesizes final responses.
"""

import redis
import os
import re
import requests
from typing import Optional, Dict, Any, List
from datetime import datetime


class OrchestratorAgent:
    """
    The main class for the Orchestrator agent.
    
    This class handles the core functionality of the Orchestrator, including
    Redis cache integration, Thinker registry, delegation logic, and response synthesis.
    """

    def __init__(self, redis_host: Optional[str] = None, redis_port: Optional[int] = None, 
                 redis_password: Optional[str] = None, redis_db: int = 0):
        """
        Initialize the OrchestratorAgent with Redis connection parameters.
        
        Args:
            redis_host: Redis server host. Defaults to REDIS_HOST env var or 'localhost'.
            redis_port: Redis server port. Defaults to REDIS_PORT env var or 6379.
            redis_password: Redis password. Defaults to REDIS_PASSWORD env var.
            redis_db: Redis database number. Defaults to 0.
        """
        self.redis_host = redis_host or os.getenv('REDIS_HOST', 'localhost')
        self.redis_port = redis_port or int(os.getenv('REDIS_PORT', 6379))
        self.redis_password = redis_password or os.getenv('REDIS_PASSWORD')
        self.redis_db = redis_db
        
        # Initialize Redis connection
        self.redis_client = self._connect_to_redis()
        
        # Initialize Thinker registry
        self.thinker_registry = {}
    
    def _connect_to_redis(self) -> redis.Redis:
        """
        Establish a connection to the Redis instance.
        
        Returns:
            A Redis client instance.
        """
        try:
            client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                password=self.redis_password,
                db=self.redis_db,
                decode_responses=True,
                health_check_interval=30
            )
            # Test the connection
            client.ping()
            return client
        except Exception as e:
            raise ConnectionError(f"Failed to connect to Redis: {str(e)}")
    
    def store_in_cache(self, key: str, value: str, ttl: Optional[int] = None) -> bool:
        """
        Store a key-value pair in the Redis cache with an optional TTL.
        
        Args:
            key: The key to store the value under.
            value: The value to store.
            ttl: Time-to-live in seconds. If None, the key will not expire.
            
        Returns:
            True if the operation was successful, False otherwise.
        """
        try:
            # Store as a Redis hash
            mapping = {
                'value': value,
                'created_at': datetime.now().isoformat(),
                'access_count': 0
            }
            
            if ttl:
                # Use pipeline for atomic operations with TTL
                pipe = self.redis_client.pipeline()
                pipe.hset(key, mapping=mapping)
                pipe.expire(key, ttl)
                pipe.execute()
            else:
                self.redis_client.hset(key, mapping=mapping)
                
            return True
        except Exception as e:
            print(f"Error storing key-value pair: {str(e)}")
            return False
    
    def retrieve_from_cache(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a value from the Redis cache by its key.
        
        Args:
            key: The key to retrieve the value for.
            
        Returns:
            A dictionary containing the value and metadata if the key exists, None otherwise.
        """
        try:
            result = self.redis_client.hgetall(key)
            if not result:
                return None
                
            # Increment access count
            self.redis_client.hincrby(key, 'access_count', 1)
            
            return result
        except Exception as e:
            print(f"Error retrieving value for key '{key}': {str(e)}")
            return None
    
    def delete_from_cache(self, key: str) -> bool:
        """
        Delete a key-value pair from the Redis cache.
        
        Args:
            key: The key to delete.
            
        Returns:
            True if the key was deleted, False if the key did not exist.
        """
        try:
            result = self.redis_client.delete(key)
            return result > 0
        except Exception as e:
            print(f"Error deleting key '{key}': {str(e)}")
            return False
    
    def register_thinker(self, specialization: str, endpoint: str) -> None:
        """
        Register a Thinker agent with its specialization and endpoint.
        
        Args:
            specialization: The specialization of the Thinker agent (e.g., "math", "code").
            endpoint: The internal API endpoint of the Thinker agent.
        """
        self.thinker_registry[specialization] = endpoint
        print(f"Registered Thinker agent for '{specialization}' at endpoint '{endpoint}'")
    
    def get_thinker_endpoint(self, specialization: str) -> Optional[str]:
        """
        Get the endpoint for a Thinker agent by its specialization.
        
        Args:
            specialization: The specialization of the Thinker agent.
            
        Returns:
            The endpoint of the Thinker agent if registered, None otherwise.
        """
        return self.thinker_registry.get(specialization)
    
    def analyze_prompt(self, prompt: str) -> Optional[str]:
        """
        Analyze an incoming prompt to determine which Thinker agent is required.
        
        Args:
            prompt: The context-enriched prompt to analyze.
            
        Returns:
            The specialization of the required Thinker agent, or None if no Thinker is needed.
        """
        # Convert prompt to lowercase for case-insensitive matching
        prompt_lower = prompt.lower()
        
        # Check for math-related keywords
        math_keywords = ['calculate', 'solve', 'equation', 'math', 'add', 'subtract', 'multiply', 'divide', 
                         'square root', 'cube root', 'power', 'exponent', 'logarithm', 'sine', 'cosine', 
                         'tangent', 'derivative', 'integral']
        if any(keyword in prompt_lower for keyword in math_keywords):
            return "math"
        
        # Check for code-related keywords
        code_keywords = ['code', 'program', 'function', 'class', 'method', 'variable', 'loop', 'condition', 
                         'algorithm', 'debug', 'error', 'exception', 'syntax', 'compile', 'execute']
        if any(keyword in prompt_lower for keyword in code_keywords):
            return "code"
        
        # Check for data analysis keywords
        data_keywords = ['data', 'analyze', 'statistics', 'mean', 'median', 'mode', 'variance', 'standard deviation',
                         'correlation', 'regression', 'plot', 'chart', 'graph', 'dataset']
        if any(keyword in prompt_lower for keyword in data_keywords):
            return "data"
        
        # If no specific Thinker is needed, return None
        return None
    
    def call_thinker(self, specialization: str, sub_problem: str) -> Optional[Dict[str, Any]]:
        """
        Call a Thinker agent to solve a sub-problem.
        
        Args:
            specialization: The specialization of the Thinker agent to call.
            sub_problem: The sub-problem to solve.
            
        Returns:
            The structured response from the Thinker agent, or None if the call failed.
        """
        # Get the endpoint for the Thinker agent
        endpoint = self.get_thinker_endpoint(specialization)
        if not endpoint:
            print(f"No Thinker agent registered for specialization '{specialization}'")
            return None
        
        try:
            # Prepare the request payload
            payload = {
                "prompt": sub_problem
            }
            
            # Make the HTTP request to the Thinker agent
            response = requests.post(endpoint, json=payload, timeout=30)
            response.raise_for_status()  # Raise an exception for HTTP errors
            
            # Return the JSON response
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error calling Thinker agent '{specialization}' at endpoint '{endpoint}': {str(e)}")
            return None
        except ValueError as e:
            print(f"Error parsing JSON response from Thinker agent '{specialization}': {str(e)}")
            return None
    
    def synthesize_response(self, prompt: str, cache_context: Optional[str], 
                           thinker_output: Optional[Dict[str, Any]]) -> str:
        """
        Synthesize a final response from the prompt, cache context, and Thinker output.
        
        Args:
            prompt: The original context-enriched prompt.
            cache_context: The context retrieved from the cache, if any.
            thinker_output: The structured output from a Thinker agent, if any.
            
        Returns:
            A synthesized response string.
        """
        # Start with the original prompt as the base
        response_parts = [f"Based on your query: '{prompt}'"]
        
        # Add cache context if available
        if cache_context:
            response_parts.append(f"\nRelevant context from cache:\n{cache_context}")
        
        # Add Thinker output if available
        if thinker_output:
            # Extract the answer from the Thinker's response
            answer = thinker_output.get('answer', 'No answer provided')
            response_parts.append(f"\nAnswer from specialized agent:\n{answer}")
            
            # Add reasoning if available
            reasoning = thinker_output.get('reasoning')
            if reasoning:
                response_parts.append(f"\nReasoning:\n{reasoning}")
        
        # If no additional context or Thinker output, indicate that
        if not cache_context and not thinker_output:
            response_parts.append("\nNo additional context or specialized processing was needed.")
        
        # Combine all parts into the final response
        return "\n".join(response_parts)
    
    def process_prompt(self, prompt: str, max_thought_loops: int = 5) -> str:
        """
        Process a context-enriched prompt through the full Orchestrator pipeline.
        
        This method implements the main control flow:
        1. Check the cache for relevant context
        2. Analyze the prompt to determine if a Thinker is needed
        3. If a Thinker is needed, call it and get its response
        4. Synthesize the final response
        
        Args:
            prompt: The context-enriched prompt to process.
            max_thought_loops: Maximum number of thought loops to prevent infinite recursion.
            
        Returns:
            The synthesized final response.
        """
        # Initialize variables for the thought loop
        current_prompt = prompt
        thought_loop_count = 0
        thinker_output = None
        
        # Thought loop for multi-step problems
        while thought_loop_count < max_thought_loops:
            # Step 1: Check cache for relevant context
            # For simplicity, we'll use a hash of the prompt as the cache key
            # In a real implementation, we might use a more sophisticated method
            cache_key = f"prompt_context:{hash(current_prompt)}"
            cache_result = self.retrieve_from_cache(cache_key)
            cache_context = cache_result.get('value') if cache_result else None
            
            # Step 2: Analyze prompt to determine if a Thinker is needed
            specialization = self.analyze_prompt(current_prompt)
            
            # Step 3: If a Thinker is needed, call it
            if specialization:
                print(f"Delegating task to '{specialization}' Thinker agent...")
                thinker_output = self.call_thinker(specialization, current_prompt)
                
                # Check if the Thinker's response indicates a need for another loop
                if thinker_output and thinker_output.get('needs_more_processing', False):
                    # Update the prompt for the next iteration
                    current_prompt = thinker_output.get('next_prompt', current_prompt)
                    thought_loop_count += 1
                    continue  # Continue to the next iteration of the thought loop
                else:
                    # If no more processing is needed, break out of the loop
                    break
            else:
                # If no Thinker is needed, break out of the loop
                break
        
        # Step 4: Synthesize the final response
        final_response = self.synthesize_response(prompt, cache_context, thinker_output)
        return final_response


def main():
    """Main entry point for the Orchestrator agent."""
    print("Orchestrator agent initialized.")
    # Initialize the Orchestrator agent
    orchestrator = OrchestratorAgent()
    
    # Example usage:
    # Register some Thinker agents
    orchestrator.register_thinker("math", "http://localhost:5001/math")
    orchestrator.register_thinker("code", "http://localhost:5002/code")
    
    # Process a sample prompt
    # prompt = "What is the square root of 144?"
    # response = orchestrator.process_prompt(prompt)
    # print(f"Final response:\n{response}")

if __name__ == "__main__":
    main()