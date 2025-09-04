# TASK-007: Integrate LLM into agents
from typing import Any, Dict, List
import ollama

class LLMService:
    """
    Service for interacting with a Language Model (LLM).
    """
    def __init__(self, model_name: str = "llama2"):
        self.model_name = model_name

    async def extract_concepts(self, text: str) -> List[str]:
        """
        Extracts key concepts from the given text using the LLM.
        """
        # This is a simplified implementation. In a real scenario, this would
        # involve more sophisticated prompting and parsing of LLM output.
        prompt = f"Extract key concepts from the following text: {text}\nConcepts:"
        response = ollama.chat(model=self.model_name, messages=[{'role': 'user', 'content': prompt}])
        # Assuming the LLM returns concepts as a comma-separated string
        concepts_str = response['message']['content'].strip()
        return [c.strip() for c in concepts_str.split(',') if c.strip()]

    async def summarize_context(self, context_data: str) -> str:
        """
        Summarizes the given context data using the LLM.
        """
        prompt = f"Summarize the following context: {context_data}\nSummary:"
        response = ollama.chat(model=self.model_name, messages=[{'role': 'user', 'content': prompt}])
        return response['message']['content'].strip()

