
import requests

class Tier3Worker:
    """
    A worker class designed to interact with the Ollama API for processing prompts.
    """

    def __init__(self, ollama_api_url: str):
        """
        Initializes the Tier3Worker with the Ollama API URL.

        Args:
            ollama_api_url (str): The base URL for the Ollama API (e.g., "http://localhost:11434").
        """
        self.ollama_api_url = ollama_api_url.rstrip('/') # Ensure no trailing slash

    def run_task(self, prompt: str) -> str:
        """
        Sends a prompt to the Ollama API and returns the generated response.

        Args:
            prompt (str): The prompt string to send to the Ollama API.

        Returns:
            str: The response from the Ollama API, or a descriptive error message
                 if an API call fails or times out.
        """
        try:
            # Assuming the Ollama API expects a JSON payload with a "prompt" key
            # and returns a JSON response with a "response" key.
            # Adjust the endpoint and payload as per actual Ollama API documentation.
            response = requests.post(
                f"{self.ollama_api_url}/api/generate",
                json={"prompt": prompt, "model": "llama2"},
                timeout=300 # 5 minutes timeout
            )
            response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)
            return response.json().get("response", "No response field found in Ollama API output.")
        except requests.exceptions.Timeout:
            return "Error: The request to Ollama API timed out after 5 minutes."
        except requests.exceptions.RequestException as e:
            return f"Error: Could not connect to Ollama API or received an error: {e}"
        except Exception as e:
            return f"An unexpected error occurred: {e}"
