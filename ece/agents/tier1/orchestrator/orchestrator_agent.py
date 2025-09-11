"""
Orchestrator Agent for the External Context Engine (ECE).

This module implements the core logic for the Orchestrator agent, which acts as the
central cognitive unit of the ECE system. It manages context, delegates tasks to
specialized agents, and synthesizes final responses.

In ECE v2.0, this agent has been enhanced with advanced reasoning workflows:
1. Parallel Thinking - leveraging diverse perspectives simultaneously
2. Exploratory Problem-Solving - iterative solution refinement
"""

import redis
import os
import re
import requests
import asyncio
import concurrent.futures
from typing import Optional, Dict, Any, List
from datetime import datetime
from xml.etree import ElementTree as ET

# Import the new components for ECE v2.0 workflows
from ece.agents.tier2.explorer_agent import ExplorerAgent
from ece.agents.tier2.critique_agent import CritiqueAgent
from ece.agents.tier2.thinker_agents import get_all_thinkers
from ece.common.sandbox import run_code_in_sandbox


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
            redis_host: Redis server host. Defaults to REDIS_HOST env var or 'redis'.
            redis_port: Redis server port. Defaults to REDIS_PORT env var or 6379.
            redis_password: Redis password. Defaults to REDIS_PASSWORD env var.
            redis_db: Redis database number. Defaults to 0.
        """
        self.redis_host = redis_host or os.getenv('REDIS_HOST', 'redis')
        self.redis_port = redis_port or int(os.getenv('REDIS_PORT', 6379))
        self.redis_password = redis_password or os.getenv('REDIS_PASSWORD')
        self.redis_db = redis_db
        
        # Initialize Redis connection
        self.redis_client = self._connect_to_redis()
        
        # Initialize Thinker registry
        self.thinker_registry = {}
        
        # Initialize new agents for ECE v2.0 workflows
        self.explorer_agent = ExplorerAgent()
        self.critique_agent = CritiqueAgent()
        
        # Execution timeout for sandboxed code
        self.execution_timeout = 30
    
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
    
    def _needs_parallel_thinking(self, prompt: str) -> bool:
        """
        Determine if a prompt requires parallel thinking from diverse perspectives.
        
        Args:
            prompt: The prompt to analyze.
            
        Returns:
            True if parallel thinking is needed, False otherwise.
        """
        # Convert to lowercase for matching
        prompt_lower = prompt.lower()
        
        # Keywords that suggest complex problems benefiting from diverse perspectives
        complex_problem_keywords = [
            'analyze', 'evaluate', 'compare', 'debate', 'discuss', 'pros and cons',
            'multiple approaches', 'different perspectives', 'strategies', 'solutions',
            'creative', 'innovative', 'design', 'plan', 'approach'
        ]
        
        return any(keyword in prompt_lower for keyword in complex_problem_keywords)
    
    def _execute_parallel_thinking(self, prompt: str) -> List[str]:
        """
        Execute the Parallel Thinking workflow using diverse Thinker personas.
        
        Args:
            prompt: The problem to think about from multiple perspectives.
            
        Returns:
            A list of perspectives in POML format.
        """
        # Create a POML representation of the problem
        problem_poml = f"<poml><problem>{prompt}</problem></poml>"
        
        # Get all available thinkers
        thinkers = get_all_thinkers()
        
        # Collect perspectives from all thinkers
        perspectives = []
        
        # Run thinking in parallel using ThreadPoolExecutor
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(thinkers)) as executor:
            # Submit all thinking tasks
            future_to_thinker = {
                executor.submit(thinker.think, problem_poml): thinker 
                for thinker in thinkers
            }
            
            # Collect results as they complete
            for future in concurrent.futures.as_completed(future_to_thinker):
                thinker = future_to_thinker[future]
                try:
                    perspective = future.result()
                    perspectives.append(perspective)
                    print(f"Received perspective from {thinker.name} Thinker")
                except Exception as e:
                    print(f"Error getting perspective from {thinker.name} Thinker: {str(e)}")
        
        return perspectives
    
    def _execute_exploratory_problem_solving(self, prompt: str, max_iterations: int = 5) -> Dict[str, Any]:
        """
        Execute the Exploratory Problem-Solving Loop.
        
        Args:
            prompt: The problem to solve.
            max_iterations: Maximum number of iterations for the loop.
            
        Returns:
            A dictionary containing the final solution and metadata.
        """
        # Create a POML representation of the problem
        problem_poml = f"<poml><problem>{prompt}</problem></poml>"
        
        # Initialize variables for the loop
        current_problem = problem_poml
        iteration_count = 0
        best_solution = None
        best_score = 0.0
        
        print(f"Starting Exploratory Problem-Solving Loop for: {prompt}")
        
        # Main loop
        while iteration_count < max_iterations:
            print(f"Iteration {iteration_count + 1}/{max_iterations}")
            
            # Step 1: Propose a solution
            print("  1. Proposing solution...")
            solution_poml = self.explorer_agent.propose_solution(current_problem)
            
            # Step 2: Execute the solution in sandbox
            print("  2. Executing solution in sandbox...")
            execution_result = self._extract_and_execute_code(solution_poml)
            
            # Create a result POML that includes the execution result
            result_poml = f"""<poml>
    <solution_evaluation>
        <solution>
            {solution_poml}
        </solution>
        <execution_result>
            <success>{execution_result['success']}</success>
            <output>{execution_result['stdout']}</output>
            <errors>{execution_result['stderr'] or execution_result['exception'] or 'None'}</errors>
        </execution_result>
    </solution_evaluation>
</poml>"""
            
            # Step 3: Critique the result
            print("  3. Critiquing result...")
            critique_poml = self.critique_agent.score_result(result_poml)
            
            # Step 4: Extract score and determine if we should continue
            score = self._extract_score_from_critique(critique_poml)
            print(f"  4. Score: {score}")
            
            # Keep track of the best solution so far
            if score > best_score:
                best_score = score
                best_solution = {
                    'solution': solution_poml,
                    'critique': critique_poml,
                    'execution': execution_result,
                    'score': score
                }
            
            # If we have a satisfactory score, break
            if score >= 0.8:  # Threshold for "good enough"
                print("    Satisfactory solution found!")
                break
            
            # Otherwise, prepare for next iteration
            iteration_count += 1
            
            # Update the problem with the critique for the next iteration
            current_problem = f"""<poml>
    <problem>{prompt}</problem>
    <previous_solution>
        {solution_poml}
    </previous_solution>
    <critique>
        {critique_poml}
    </critique>
</poml>"""
        
        print(f"Exploratory Problem-Solving Loop completed after {iteration_count + 1} iterations")
        print(f"Best solution score: {best_score}")
        
        return best_solution or {}
    
    def _extract_and_execute_code(self, solution_poml: str) -> Dict[str, Any]:
        """
        Extract code from a solution POML and execute it in the sandbox.
        
        Args:
            solution_poml: The solution in POML format.
            
        Returns:
            The result of code execution.
        """
        try:
            # Parse the POML to extract code
            root = ET.fromstring(solution_poml)
            code_element = root.find('.//code')
            
            if code_element is not None and code_element.text:
                code = code_element.text.strip()
                # Execute the code in the sandbox
                return run_code_in_sandbox(code, timeout=self.execution_timeout)
            else:
                # No code found, return a default result
                return {
                    "stdout": "",
                    "stderr": "",
                    "exception": "No executable code found in solution",
                    "success": False,
                    "container_id": None
                }
        except ET.ParseError as e:
            return {
                "stdout": "",
                "stderr": "",
                "exception": f"Error parsing POML: {str(e)}",
                "success": False,
                "container_id": None
            }
        except Exception as e:
            return {
                "stdout": "",
                "stderr": "",
                "exception": f"Error extracting/running code: {str(e)}",
                "success": False,
                "container_id": None
            }
    
    def _extract_score_from_critique(self, critique_poml: str) -> float:
        """
        Extract the score from a critique POML.
        
        Args:
            critique_poml: The critique in POML format.
            
        Returns:
            The score as a float between 0.0 and 1.0.
        """
        try:
            # Parse the POML to extract score
            root = ET.fromstring(critique_poml)
            score_element = root.find('.//score')
            
            if score_element is not None and score_element.text:
                # Try to convert to float
                return float(score_element.text.strip())
            else:
                # Default score if none found
                return 0.5
        except (ET.ParseError, ValueError) as e:
            # Default score if parsing fails
            return 0.5
    
    def _synthesize_advanced_response(self, prompt: str, 
                                    parallel_thinking_results: Optional[List[str]] = None,
                                    exploratory_results: Optional[Dict[str, Any]] = None,
                                    cache_context: Optional[str] = None,
                                    thinker_output: Optional[Dict[str, Any]] = None) -> str:
        """
        Synthesize a final response from all available information sources.
        
        Args:
            prompt: The original prompt.
            parallel_thinking_results: Results from parallel thinking workflow.
            exploratory_results: Results from exploratory problem-solving workflow.
            cache_context: Context from cache.
            thinker_output: Output from traditional thinker agents.
            
        Returns:
            A synthesized response string.
        """
        response_parts = [f"Based on your query: '{prompt}'"]
        
        # Add context from cache if available
        if cache_context:
            response_parts.append(f"\nRelevant context from cache:\n{cache_context}")
        
        # Add results from parallel thinking if available
        if parallel_thinking_results:
            response_parts.append("\n\nDiverse perspectives considered:")
            for i, perspective in enumerate(parallel_thinking_results, 1):
                try:
                    root = ET.fromstring(perspective)
                    thinker_name = root.find('.//perspective').get('thinker', f'Thinker {i}')
                    analysis = root.find('.//analysis')
                    analysis_text = analysis.text if analysis is not None else "No analysis provided"
                    response_parts.append(f"\n{thinker_name} perspective: {analysis_text}")
                except ET.ParseError:
                    response_parts.append(f"\nPerspective {i}: {perspective}")
        
        # Add results from exploratory problem-solving if available
        if exploratory_results:
            response_parts.append(f"\n\nSolution analysis (confidence score: {exploratory_results.get('score', 'N/A')}):")
            solution = exploratory_results.get('solution', 'No solution available')
            critique = exploratory_results.get('critique', 'No critique available')
            execution = exploratory_results.get('execution', {})
            
            # Extract key information from solution
            try:
                root = ET.fromstring(solution)
                steps = root.findall('.//step')
                if steps:
                    response_parts.append("\nProposed approach:")
                    for step in steps:
                        response_parts.append(f"  - {step.text}")
            except ET.ParseError:
                pass
            
            # Add execution results
            if execution:
                success = execution.get('success', False)
                output = execution.get('stdout', '')
                errors = execution.get('stderr', '') or execution.get('exception', '')
                
                response_parts.append(f"\nExecution {'succeeded' if success else 'failed'}")
                if output:
                    response_parts.append(f"Output: {output}")
                if errors:
                    response_parts.append(f"Errors: {errors}")
            
            # Extract critique information
            try:
                root = ET.fromstring(critique)
                rationale = root.find('.//rationale')
                suggestions = root.findall('.//suggestion')
                
                if rationale is not None and rationale.text:
                    response_parts.append(f"\nEvaluation: {rationale.text}")
                
                if suggestions:
                    response_parts.append("\nImprovement suggestions:")
                    for suggestion in suggestions:
                        response_parts.append(f"  - {suggestion.text}")
            except ET.ParseError:
                pass
        
        # Add traditional thinker output if available
        if thinker_output:
            answer = thinker_output.get('answer', 'No answer provided')
            reasoning = thinker_output.get('reasoning')
            response_parts.append(f"\n\nSpecialized processing result:\n{answer}")
            if reasoning:
                response_parts.append(f"\nReasoning:\n{reasoning}")
        
        # If no advanced processing was done, indicate that
        if not parallel_thinking_results and not exploratory_results and not thinker_output:
            response_parts.append("\n\nNo specialized processing was needed for this query.")
        
        return "\n".join(response_parts)
    
    def process_prompt(self, prompt: str, max_thought_loops: int = 5) -> str:
        """
        Process a context-enriched prompt through the full Orchestrator pipeline.
        
        This method implements the main control flow with ECE v2.0 enhancements:
        1. Check the cache for relevant context
        2. Determine which advanced reasoning workflow to use (if any)
        3. Execute the appropriate workflow(s)
        4. Synthesize the final response
        
        Args:
            prompt: The context-enriched prompt to process.
            max_thought_loops: Maximum number of thought loops to prevent infinite recursion.
            
        Returns:
            The synthesized final response.
        """
        print(f"Processing prompt: {prompt}")
        
        # Initialize variables
        current_prompt = prompt
        thought_loop_count = 0
        thinker_output = None
        parallel_thinking_results = None
        exploratory_results = None
        
        # Step 1: Check cache for relevant context
        cache_key = f"prompt_context:{hash(current_prompt)}"
        cache_result = self.retrieve_from_cache(cache_key)
        cache_context = cache_result.get('value') if cache_result else None
        
        # Step 2: Determine which processing approach to use
        specialization = self.analyze_prompt(current_prompt)
        
        # Step 3: Apply advanced reasoning workflows if appropriate
        if self._needs_parallel_thinking(current_prompt):
            print("Applying Parallel Thinking workflow...")
            parallel_thinking_results = self._execute_parallel_thinking(current_prompt)
        else:
            # Traditional approach for simpler tasks
            # Thought loop for multi-step problems
            while thought_loop_count < max_thought_loops:
                # Analyze prompt to determine if a Thinker is needed
                specialization = self.analyze_prompt(current_prompt)
                
                # If a Thinker is needed, call it
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
        
        # For complex problem-solving tasks, use the Exploratory Problem-Solving Loop
        if "solve" in current_prompt.lower() or "problem" in current_prompt.lower():
            print("Applying Exploratory Problem-Solving workflow...")
            exploratory_results = self._execute_exploratory_problem_solving(current_prompt)
        
        # Step 4: Synthesize the final response using all available information
        final_response = self._synthesize_advanced_response(
            prompt, 
            parallel_thinking_results, 
            exploratory_results, 
            cache_context, 
            thinker_output
        )
        
        return final_response


def main():
    """Main entry point for the Orchestrator agent."""
    print("Orchestrator agent (ECE v2.0) initialized.")
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