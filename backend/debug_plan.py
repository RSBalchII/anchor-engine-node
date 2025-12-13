
import asyncio
import logging
import json
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.llm import LLMClient
from src.agents.orchestrator.prompts import PLANNER_PERSONA

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    print("Initializing LLMClient...")
    llm = LLMClient()
    
    # Mock history similar to orchestrator
    current_history = [
        {"role": "system", "content": PLANNER_PERSONA},
        {"role": "user", "content": "Context:\nUser is testing the system.\n\nUser Request: Hello, are you working?"}
    ]
    
    print("Generating response...")
    try:
        response_text = await llm.generate_response(
            messages=current_history,
            temperature=0.2,
            json_mode=True
        )
        
        print("\n--- RAW RESPONSE ---")
        print(response_text)
        print("--------------------\n")
        
        print("Attempting JSON parse...")
        try:
            data = json.loads(response_text)
            print("✅ JSON Parse Successful")
            print(json.dumps(data, indent=2))
        except json.JSONDecodeError as e:
            print(f"❌ JSON Parse Failed: {e}")
            
    except Exception as e:
        print(f"❌ Error during generation: {e}")
    finally:
        await llm.close()

if __name__ == "__main__":
    asyncio.run(main())
