import httpx
import logging
import os
import datetime
import json
import sys

# Setup logging
# Goal: Log to project_root/logs/test_chat_interface.log
# Assuming we run from backend/
# project_root is ../

# Determine paths based on script location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# SCRIPT_DIR is backend/scripts/tests
BACKEND_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

LOG_DIR = os.path.join(PROJECT_ROOT, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "test_chat_interface.log")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE, encoding='utf-8')
    ]
)

logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8000/chat/"

TEST_MESSAGES = [
    "Hello, who are you?",
    "What is the capital of France?",
    "Tell me a short joke about programming."
]

def run_tests():
    logger.info("Starting Chat Interface Tests")
    logger.info(f"Target URL: {BASE_URL}")
    logger.info(f"Logging to: {LOG_FILE}")

    for i, msg in enumerate(TEST_MESSAGES):
        logger.info(f"--- Test Case {i+1} ---")
        logger.info(f"User Message: {msg}")
        
        payload = {
            "session_id": f"test-session-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}",
            "message": msg,
            "system_prompt": "You are a helpful assistant."
        }
        
        try:
            logger.info("Sending request...")
            # Increased timeout to 120s as local LLM generation can be slow
            response = httpx.post(BASE_URL, json=payload, timeout=120.0)
            
            logger.info(f"Response Status Code: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    logger.info(f"Response Body: {json.dumps(data, indent=2)}")
                    if "response" in data:
                        logger.info(f"Assistant Reply: {data['response']}")
                    else:
                        logger.warning("Field 'response' not found in JSON body.")
                except json.JSONDecodeError:
                    logger.error(f"Failed to decode JSON response: {response.text}")
            else:
                logger.error(f"Request failed: {response.text}")
                
        except Exception as e:
            logger.error(f"Exception during request: {e}")
            
    logger.info("Tests Completed")

if __name__ == "__main__":
    run_tests()
