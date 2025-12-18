import httpx
import logging
import os
import sys
import json
import datetime

# Setup logging
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

LOG_DIR = os.path.join(PROJECT_ROOT, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "test_bridge_endpoints.log")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE, encoding='utf-8')
    ]
)

logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8000"

def test_ingest():
    logger.info("--- Testing /archivist/ingest (Save to Memory) ---")
    url = f"{BASE_URL}/archivist/ingest"
    payload = {
        "content": f"Test content from bridge test script at {datetime.datetime.now()}",
        "type": "web_page",
        "adapter": "test_adapter"
    }
    headers = {
        "Authorization": "Bearer secret-token"
    }
    
    try:
        logger.info(f"Sending POST request to {url}")
        response = httpx.post(url, json=payload, headers=headers, timeout=30.0)
        logger.info(f"Response Status Code: {response.status_code}")
        
        if response.status_code == 200:
            logger.info(f"Response Body: {json.dumps(response.json(), indent=2)}")
            logger.info("✅ Ingest Test Passed")
        else:
            logger.error(f"❌ Ingest Test Failed: {response.text}")
            
    except Exception as e:
        logger.error(f"❌ Exception during ingest test: {e}")

def test_clear_context():
    logger.info("--- Testing /context/{session_id} (Clear Memory) ---")
    session_id = "test-session-bridge"
    url = f"{BASE_URL}/context/{session_id}"
    
    try:
        logger.info(f"Sending DELETE request to {url}")
        response = httpx.delete(url, timeout=30.0)
        logger.info(f"Response Status Code: {response.status_code}")
        
        if response.status_code == 200:
            logger.info(f"Response Body: {json.dumps(response.json(), indent=2)}")
            logger.info("✅ Clear Context Test Passed")
        else:
            logger.error(f"❌ Clear Context Test Failed: {response.text}")
            
    except Exception as e:
        logger.error(f"❌ Exception during clear context test: {e}")

if __name__ == "__main__":
    logger.info("Starting Bridge Endpoint Tests")
    test_ingest()
    test_clear_context()
    logger.info("Bridge Tests Completed")
