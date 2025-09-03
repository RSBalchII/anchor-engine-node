# /src/agents.py

class Agent:
    """
    Base class for all agents in the Elysia framework.
    Provides a consistent interface for agent activation and execution.
    """
    def __init__(self, name):
        self.name = name
        print(f"Agent {self.name} initialized.")

    def run(self, prompt=None):
        """
        The main execution method for the agent.
        This method should be overridden by subclasses.
        """
        raise NotImplementedError("Each agent must implement its own run method.")

class QueryAnalysisAgent(Agent):
    """
    Analyzes the user's prompt to determine intent and next steps.
    """
    def __init__(self):
        super().__init__("QueryAnalysisAgent")

    def run(self, prompt):
        print(f"[{self.name}] Analyzing user prompt: '{prompt}'")
        # In the future, this is where NLP processing will happen.
        # For now, we'll just return a simple analysis.
        return "Intent: User query detected. Action: Further processing required."

class ProactiveStewardshipAgent(Agent):
    """
    Manages autonomous, background tasks when no user prompt is present.
    """
    def __init__(self):
        super().__init__("ProactiveStewardshipAgent")

    def run(self, prompt=None):
        print(f"[{self.name}] No user prompt detected. Checking for autonomous tasks.")
        # Future logic for proactive tasks will go here.
        return "Status: System idle. No proactive tasks triggered."
