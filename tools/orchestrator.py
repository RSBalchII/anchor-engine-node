import os
import requests
import json
import logging

# Config - Defaults match start-bridge.bat
BRIDGE_PORT = os.getenv("BRIDGE_PORT", "8080")
BRIDGE_HOST = os.getenv("BRIDGE_HOST", "localhost")
BRIDGE_URL = f"http://{BRIDGE_HOST}:{BRIDGE_PORT}"
MLC_INFERENCE_ENDPOINT = f"{BRIDGE_URL}/v1/chat/completions"
BRIDGE_TOKEN = os.getenv("BRIDGE_TOKEN", "sovereign-secret")

logger = logging.getLogger("Orchestrator")
logging.basicConfig(level=logging.INFO)

class MLCConnectionError(Exception):
    """Raised when connection to the MLC Bridge fails."""
    pass

class Orchestrator:
    def __init__(self, endpoint=MLC_INFERENCE_ENDPOINT, token=BRIDGE_TOKEN):
        self.endpoint = endpoint
        self.token = token
        self.active_model = None
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def load_mlc_model(self, model_name):
        """
        Configures the orchestrator for a specific model.
        Verifies connectivity to the Bridge and logs available models.
        """
        logger.info(f"Preparing Orchestrator for model: {model_name}")
        
        try:
            # Health check / Model list
            r = requests.get(f"{BRIDGE_URL}/v1/models", headers=self.headers, timeout=2.0)
            r.raise_for_status()
            models_data = r.json().get("data", [])
            available_ids = [m['id'] for m in models_data]
            logger.info(f"Bridge connected. Active Workers: {available_ids}")
            
            if not available_ids:
                logger.warning("No WebGPU workers connected to Bridge. Open model-server-chat.html")
            
        except requests.exceptions.RequestException as e:
            raise MLCConnectionError(f"Failed to connect to Wave Bridge at {BRIDGE_URL}. Ensure start-bridge.bat is running. Error: {e}")

        self.active_model = model_name
        return True

    def invoke_mlc_inference(self, prompt, system_prompt="You are a helpful AI orchestrator."):
        """
        Sends a prompt to the MLC engine via the Bridge.
        """
        if not self.active_model:
            raise ValueError("No model loaded. Call load_mlc_model() first.")

        payload = {
            "model": self.active_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "stream": False
        }

        try:
            logger.info(f"Sending inference request to {self.endpoint}...")
            response = requests.post(
                self.endpoint, 
                json=payload, 
                headers=self.headers,
                timeout=60 # Inference can be slow
            )
            response.raise_for_status()
            
            result = self._parse_response(response.json())
            return result

        except requests.exceptions.RequestException as e:
            logger.error(f"Inference request failed: {e}")
            raise MLCConnectionError(f"Inference failed: {e}")

    def _parse_response(self, mlc_response):
        """
        Extracts the content from the OpenAI-compatible JSON response.
        """
        try:
            # Check for bridge-reported errors
            if "error" in mlc_response:
                raise Exception(mlc_response["error"])

            choices = mlc_response.get("choices", [])
            if not choices:
                logger.warning("Empty choices in response")
                return ""
            
            content = choices[0].get("message", {}).get("content", "")
            return content
        except Exception as e:
            logger.error(f"Error parsing MLC response: {e}")
            return f"[Error parsing output: {e}]"

# CLI usage
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Orchestrator CLI")
    parser.add_argument("--prompt", type=str, help="Prompt to send")
    parser.add_argument("--model", type=str, default="webgpu-chat", help="Model ID")
    args = parser.parse_args()

    if args.prompt:
        orc = Orchestrator()
        try:
            orc.load_mlc_model(args.model)
            print(f"\nResponse:\n{orc.invoke_mlc_inference(args.prompt)}")
        except Exception as e:
            print(f"Error: {e}")
    else:
        print("Usage: python orchestrator.py --prompt 'Hello'")
