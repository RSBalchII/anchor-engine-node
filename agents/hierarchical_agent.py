import concurrent.futures
import json

import requests
from llama_cpp import Llama

class HierarchicalAgent:
    def __init__(self):
        self.blackboard_path = "blackboard.md"
        self.worker_crew = []
        self.llm = Llama(
            model_path="C:Usersrsbiiwmodelsdeepseek-v2deepseek-v2-q8_0.gguf",
            n_gpu_layers=35,
            verbose=False
        )

      

    def run_worker_agent(self, task_prompt: str) -> str:
        try:
            output = self.llm(
                task_prompt,
                max_tokens=2048,
                temperature=0.7
            )
            return output['choices'][0]['text']
        except Exception as e:
            return f"Local inference error: {str(e)}"

    class SpecialistAgent:
        """
        A Tier 2 agent that orchestrates a crew of Tier 3 worker agents.
        """
        def __init__(self):
            self.blackboard_path = "blackboard.md"
            self.worker_crew = []

        def _synthesize_results(self, raw_results: list) -> str:
            """
            Synthesizes raw results from worker agents into a cohesive summary.

            Args:
                raw_results: A list of strings, where each string is a result from a worker.

            Returns:
                A single string containing the synthesized summary.
            """
            synthesis = "## Synthesized Results\n\n"
            for i, result in enumerate(raw_results):
                synthesis += f"### Worker {i+1} Contribution\n"
                synthesis += f"{result}\n\n"
            return synthesis

        def orchestrate_task(self, user_request: str) -> str:
            """
            Orchestrates the worker crew to perform a task based on the user request.

            Args:
                user_request: The high-level task from the user.

            Returns:
                A synthesized summary of the results from the worker crew.
            """
            # 1. Generate 5 slightly different task prompt variations
            task_prompts = [
                f"{user_request} - Focus on the perspective of a hiring manager.",
                f"{user_request} - Focus on the required technical skills and programming languages.",
                f"{user_request} - Focus on salary trends and compensation packages.",
                f"{user_request} - Focus on remote work opportunities and work-life balance.",
                f"{user_request} - Focus on the impact of AI on software development roles.",
            ]

            # 2. Launch the worker agents in parallel
            raw_results = []
            # Access the outer class's _run_worker_agent method
            hierarchical_agent_instance = HierarchicalAgent()
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                future_to_prompt = {executor.submit(hierarchical_agent_instance._run_worker_agent, prompt): prompt for prompt in task_prompts}
                for future in concurrent.futures.as_completed(future_to_prompt):
                    prompt = future_to_prompt[future]
                    try:
                        result = future.result()
                        raw_results.append(result)
                    except Exception as exc:
                        raw_results.append(f"'{prompt}' generated an exception: {exc}")

            # 3. Append raw results to the blackboard file
            try:
                with open(self.blackboard_path, "a") as f:
                    f.write(f"## Task: {user_request}\n\n")
                    for i, result in enumerate(raw_results):
                        f.write(f"### Raw Result from Worker {i+1}\n")
                        f.write(f"{result}\n\n")
            except IOError as e:
                print(f"Error writing to blackboard file: {e}")


            # 4. Synthesize the results
            synthesized_result = self._synthesize_results(raw_results)

            return synthesized_result