# TASK-008: Update Orchestrator agent router
# src/external_context_engine/orchestrator.py

import yaml
from src.external_context_engine.memory_management.agents.archivist_agent import EnhancedArchivistAgent
from src.external_context_engine.memory_management.agents.q_learning_agent import QLearningGraphAgent

class Orchestrator:
    """
    The core of the ECE, refactored to use a schema-guided decision tree.
    Manages the flow of control and delegates tasks to specialized agents
    based on the intent derived from the user prompt.
    """
    def __init__(self, config, archivist_agent: EnhancedArchivistAgent, q_learning_agent: QLearningGraphAgent):
        """
        Initializes the Orchestrator with a configuration and agent instances.

        Args:
            config (dict): The configuration dictionary, expected to contain
                           a 'decision_tree'.
            archivist_agent: An instance of EnhancedArchivistAgent.
            q_learning_agent: An instance of QLearningGraphAgent.
        """
        print("Orchestrator Initialized with local SGR implementation.")
        if 'decision_tree' not in config:
            raise ValueError("Configuration must contain a 'decision_tree'.")
        self.decision_tree = config['decision_tree']
        self.archivist_agent = archivist_agent
        self.q_learning_agent = q_learning_agent

    async def _execute_agent_plan(self, intent: str, user_prompt: str):
        """
        Executes the appropriate agent based on the matched intent.
        """
        if intent == "QueryMemory": # Example intent
            # Assuming process_query takes the raw user prompt
            return await self.archivist_agent.process_query(user_prompt)
        elif intent == "TrainQLAgent": # Example intent
            # This would typically be an offline process, but for demonstration
            # we can imagine a simplified online training trigger.
            # For now, just return a placeholder.
            return {"status": "QLearning agent training triggered (placeholder)"}
        else:
            return {"status": f"No specific agent action for intent: {intent}"}

    async def run(self, user_prompt, execute_agents=True):
        """
        The primary decision-making loop of the ECE. It uses the decision tree
        to determine the user's intent and executes the corresponding agents.

        Args:
            user_prompt (str): The input from the user.
            execute_agents (bool): Whether to execute agents or return plan only.

        Returns:
            dict: Result containing executed action or action plan.
        """
        print(f"\n--- Orchestrator Loop Start ---")
        print(f"Received prompt: '{user_prompt}'")
        
        prompt_lower = user_prompt.lower()
        
        # Default to the 'Default' intent
        matched_intent = next((item for item in self.decision_tree if item['intent'] == 'Default'), None)

        # Find the best matching intent
        for item in self.decision_tree:
            if 'keywords' in item:
                for keyword in item['keywords']:
                    if keyword.lower() in prompt_lower:
                        matched_intent = item
                        break
            if matched_intent['intent'] != 'Default':
                break
        
        # Formulate the response based on the matched intent
        if matched_intent:
            intent = matched_intent['intent']
            description = matched_intent['description']
            action_plan = matched_intent['action_plan']
            
            result = {
                "intent": intent,
                "description": description,
                "action_plan": action_plan,
                "executed": False,
                "result": None
            }
            
            # Execute agents if enabled
            if execute_agents and hasattr(self, '_agent_factory'):
                try:
                    agent_result = await self._execute_agent_plan(intent, user_prompt)
                    result["executed"] = True
                    result["result"] = agent_result
                except Exception as e:
                    print(f"Error executing agent: {str(e)}")
                    result["error"] = str(e)
            
            # Fallback to text response if not executing
            if not result["executed"]:
                response = (
                    f"**Reasoning:**\n"
                    f"1. **Intent:** {intent}\n"
                    f"2. **Description:** {description}\n"
                    f"3. **Action Plan:**\n"
                )
                for i, step in enumerate(action_plan, 1):
                    response += f"   {i}. {step}\n"
                result["text_response"] = response

        else:
            # This case should ideally not be reached if a 'Default' is defined
            result = {
                "intent": "unknown",
                "error": "I'm not sure how to proceed. No matching intent found."
            }

        print(f"--- Orchestrator Loop End ---")
        return result
