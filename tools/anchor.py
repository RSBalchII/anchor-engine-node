import requests
import sys
import json
import argparse

# Configuration
BRIDGE_URL = "http://localhost:8000"

def check_connection():
    try:
        requests.get(f"{BRIDGE_URL}/health", timeout=1)
        return True
    except:
        return False

def chat_loop():
    print("\n⚓ Anchor Terminal (Chat Mode)")
    print("--------------------------------")
    print("Connecting to Ghost Engine...")
    
    if not check_connection():
        print(f"❌ Could not connect to {BRIDGE_URL}")
        print("   -> Run 'start-anchor.bat' first.")
        return

    # Conversation History
    history = [
        {"role": "system", "content": "You are Anchor, a helpful AI assistant running locally."}
    ]
    
    print("✅ Connected. Type 'exit' to quit, 'clear' to reset.\n")

    while True:
        try:
            user_input = input("You: ").strip()
            if not user_input: continue
            
            if user_input.lower() in ['exit', 'quit']:
                print("👋 Disconnecting.")
                break
                
            if user_input.lower() == 'clear':
                history = [history[0]] # Keep system prompt
                print("--- Context Cleared ---")
                continue

            # Add User Message
            history.append({"role": "user", "content": user_input})
            print("Anchor: ", end="", flush=True)

            # Send to Bridge
            try:
                response = requests.post(
                    f"{BRIDGE_URL}/v1/chat/completions",
                    json={
                        "messages": history,
                        "stream": False # Bridge accumulates stream for us
                    },
                    timeout=120
                )
                
                if response.status_code == 200:
                    data = response.json()
                    ai_text = data['choices'][0]['message']['content']
                    print(ai_text + "\n")
                    history.append({"role": "assistant", "content": ai_text})
                else:
                    print(f"❌ Error {response.status_code}: {response.text}")
                    
            except Exception as e:
                print(f"❌ Request Failed: {e}")

        except KeyboardInterrupt:
            print("\nInterrupted.")
            break

if __name__ == "__main__":
    chat_loop()