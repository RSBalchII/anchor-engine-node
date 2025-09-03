# /src/orchestrator.py

from agents import QueryAnalysisAgent, ProactiveStewardshipAgent

class Orchestrator:
    """
    The core of the Elysia framework.
    Manages the flow of control and delegates tasks to specialized agents
    based on the presence and content of a user prompt.
    """
    def __init__(self):
        print("Orchestrator initialized. Awaiting input...")
        self.query_agent = QueryAnalysisAgent()
        self.stewardship_agent = ProactiveStewardshipAgent()

    def main_loop(self, user_prompt=None):
        """
        The primary decision-making loop of the ECE.
        """
        print("
--- Orchestrator Main Loop Start ---")
        if user_prompt:
            # Task 004: Implement the first branch of the decision tree
            print("User prompt found.")
            result = self.query_agent.run(user_prompt)
        else:
            print("No user prompt provided.")
            result = self.stewardship_agent.run()

        print(f"Orchestrator result: {result}")
        print("--- Orchestrator Main Loop End ---
")
        return result

if __name__ == '__main__':
    # Create an instance of the orchestrator
    orchestrator = Orchestrator()

    # --- SIMULATION ---
    # 1. Simulate a run with a user prompt
    print(">>> Running simulation with a user prompt.")
    orchestrator.main_loop(user_prompt="Analyze the latest project status report and summarize key risks.")

    # 2. Simulate a run without a user prompt
    print(">>> Running simulation without a user prompt.")
    orchestrator.main_loop()
