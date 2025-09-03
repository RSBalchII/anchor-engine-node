# src/external_context_engine/orchestrator.py

import yaml

class Orchestrator:
    """
    The core of the ECE, refactored to use a schema-guided decision tree.
    Manages the flow of control and delegates tasks to specialized agents
    based on the intent derived from the user prompt.
    """
    def __init__(self, config):
        """
        Initializes the Orchestrator with a configuration.

        Args:
            config (dict): The configuration dictionary, expected to contain
                           a 'decision_tree'.
        """
        print("Orchestrator Initialized with local SGR implementation.")
        if 'decision_tree' not in config:
            raise ValueError("Configuration must contain a 'decision_tree'.")
        self.decision_tree = config['decision_tree']

    def run(self, user_prompt):
        """
        The primary decision-making loop of the ECE. It uses the decision tree
        to determine the user's intent and the corresponding action plan.

        Args:
            user_prompt (str): The input from the user.

        Returns:
            str: A formatted string containing the reasoning and action plan.
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
            
            response = (
                f"**Reasoning:**\n"
                f"1. **Intent:** {intent}\n"
                f"2. **Description:** {description}\n"
                f"3. **Action Plan:**\n"
            )
            for i, step in enumerate(action_plan, 1):
                response += f"   {i}. {step}\n"

        else:
            # This case should ideally not be reached if a 'Default' is defined
            response = "I'm not sure how to proceed. No matching intent found."

        print(f"--- Orchestrator Loop End ---")
        return response
