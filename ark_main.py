# ark_main.py
# Version 4.0: Multi-Model Plan-and-Execute Architecture
# Author: Rob Balch II & Sybil
# ark_main.py (Refactored)
# Description: Implements a plan-and-execute loop for The Ark.

import requests
import json
import re
import traceback
import ast
import re
import logging
from sybil_agent import SybilAgent

# --- Configuration ---
OLLAMA_URL = "http://localhost:11434/api/generate"
# Use a specialized model for planning and another for synthesis
PLANNER_MODEL = "deepseek-r1:8b-0528-qwen3-q8_0" 
SYNTHESIZER_MODEL = "samantha-mistral:7b"

# --- PROMPT ENGINEERING ---

PLANNER_PROMPT = """
# ROLE: You are a JSON planning agent.
# TASK: Create a JSON array of tool calls to fulfill the user's request.
# OUTPUT: Your response MUST be ONLY a markdown JSON block.

# TOOLS:
# - web_search(query: str)
# - store_memory(text_to_store: str)
# - retrieve_similar_memories(query_text: str)
# - list_project_files()
# - read_multiple_files(filepaths: list)
# - analyze_code(filepath: str)

# EXAMPLE:
# USER REQUEST: what is the weather in Paris and can you save this conversation?
# YOUR PLAN:
# ```json
# [
#     {{
#         "reasoning": "Find the weather in Paris.",
#         "tool_call": "web_search(query=\\"weather in Paris\\")"
#     }},
#     {{
#         "reasoning": "Save the user's request to memory.",
#         "tool_call": "store_memory(text_to_store=\\"what is the weather in Paris and can you save this conversation?\\")"
#     }}
# ]
# ```

# --- YOUR TURN ---

# USER REQUEST: "{user_input}"
# YOUR PLAN:
"""

SYNTHESIS_PROMPT = """
You are Samantha, a helpful and empathetic AI assistant. Your only task is to synthesize the results of the executed plan into a single, natural, and conversational answer for your user, Rob.

**IMPORTANT RULES:**
1. You MUST base your answer ONLY on the information provided in the TOOL EXECUTION RESULTS.
2. Address the output from EACH tool call to provide a complete answer.
3. Speak naturally, as if you were having a real conversation.

---
**USER'S ORIGINAL REQUEST:**
"{user_input}"

---
**TOOL EXECUTION RESULTS:**
{tool_outputs}
---

Based on the results, provide a clear and friendly answer to Rob.
"""
OLLAMA_MODEL = "phi4-mini-reasoning:3.8b-q8_0" 
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Sybil's New Planner Prompt ---
PLANNER_PROMPT = """
# ROLE: You are a JSON planning agent.
# TASK: Create a JSON array of tool calls to fulfill the user's request.
# OUTPUT: Your response MUST be ONLY a markdown JSON block.

# TOOLS:
# - web_search(query: str)
# - store_memory(text_to_store: str)
# - retrieve_similar_memories(query_text: str)
# - list_project_files()
# - read_multiple_files(filepaths: list)
# - analyze_code(filepath: str)
# - analyze_screen(question: str)
# - move_mouse(x: int, y: int)
# - click_mouse(button: str)
# - type_text(text: str)


# EXAMPLE 1:
# USER REQUEST: what is the weather in Paris and can you save this conversation?
# YOUR PLAN:
# ```json
# [
#     {{
#         "reasoning": "Find the weather in Paris.",
#         "tool_call": "web_search(query=\\"weather in Paris\\")"
#     }},
#     {{
#         "reasoning": "Save the user's request to memory.",
#         "tool_call": "store_memory(text_to_store=\\"what is the weather in Paris and can you save this conversation?\\")"
#     }}
# ]
# ```

# EXAMPLE 2:
# USER REQUEST: Open the calculator app and type '2+2'.
# YOUR PLAN:
# ```json
# [
#     {{
#         "reasoning": "First, I need to find the calculator icon on the screen.",
#         "tool_call": "analyze_screen(question=\\"What are the coordinates of the calculator app icon?\\")"
#     }},
#     {{
#         "reasoning": "Next, I need to move the mouse to those coordinates. Assuming the vision model returns X=100, Y=250.",
#         "tool_call": "move_mouse(x=100, y=250)"
#     }},
#     {{
#         "reasoning": "Now I will double-click the icon to open the app.",
#         "tool_call": "click_mouse(button=\\"left\\")"
#     }},
#     {{
#         "reasoning": "I will click a second time for a double-click.",
#         "tool_call": "click_mouse(button=\\"left\\")"
#     }},
#     {{
#         "reasoning": "Finally, I will type '2+2' into the application.",
#         "tool_call": "type_text(text=\\"2+2\\")"
#     }}
# ]
# ```

# --- YOUR TURN ---

# USER REQUEST: "{user_input}"
# YOUR PLAN:
"""

def call_ollama(prompt: str) -> str | None:
    """Sends a prompt to the Ollama API and returns the response."""
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": { "temperature": 0.0 }
    }
    try:
        logging.info("Sending prompt to Ollama...")
        response = requests.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        response_json = response.json()
        return response_json['response'].strip()
    except requests.exceptions.RequestException as e:
        logging.error(f"API call to Ollama failed: {e}")
        return None

def parse_tool_call(call_string: str) -> tuple[str, dict] | tuple[None, None]:
    """Parses a tool call string like 'func(arg1=val1)' into a name and args dict."""
    try:
        tree = ast.parse(call_string)
        call_node = tree.body[0].value

        if not isinstance(call_node, ast.Call):
            logging.error(f"Tool call string is not a valid call expression: {call_string}")
            return None, None

        tool_name = call_node.func.id
        tool_args = {}
        for kw in call_node.keywords:
            key = kw.arg
            if isinstance(kw.value, ast.Constant): # For Python 3.8+
                tool_args[key] = kw.value.value
            else: # Fallback for older Python versions
                tool_args[key] = ast.literal_eval(kw.value)

        return tool_name, tool_args
    except (SyntaxError, IndexError, AttributeError, ValueError) as e:
        logging.error(f"Failed to parse tool call string '{call_string}': {e}")
        return None, None

def clean_json_response(response_text: str) -> str:
    """Extracts a JSON block from a markdown-formatted string."""
    match = re.search(r'```json\s*([\s\S]*?)\s*```', response_text)
    if match:
        return match.group(1)
    return response_text

def run_ark():
    """Main function to run the plan-and-execute loop."""
    agent = SybilAgent()
    print("Sybil is online. You can now chat. Type 'exit' to end the session.")
    while True:
        try:
            user_input = input("Rob: ")
            if user_input.lower() in ['exit', 'quit']:
                break
            process_user_request(user_input, agent)
            
            logging.info("Sybil is generating a plan...")
            prompt = PLANNER_PROMPT.format(user_input=user_input)
            llm_response = call_ollama(prompt)

            if not llm_response:
                print("Sybil: I had trouble generating a plan. Please try again.")
                continue

            plan_str = clean_json_response(llm_response)
            try:
                plan = json.loads(plan_str)
            except json.JSONDecodeError:
                logging.error(f"Failed to decode JSON plan: {plan_str}")
                print("Sybil: I generated a plan, but it wasn't in the correct format.")
                continue

            logging.info(f"Executing a plan with {len(plan)} steps.")
            for i, step in enumerate(plan):
                reasoning = step.get('reasoning', 'No reasoning provided.')
                print(f"--- Step {i+1}: {reasoning} ---")

                tool_call_str = step.get("tool_call")
                if not tool_call_str:
                    print("Sybil: This step had no tool call. Skipping.")
                    continue

                tool_name, tool_args = parse_tool_call(tool_call_str)

                if not tool_name:
                    print(f"Sybil: I could not understand the tool call '{tool_call_str}'. Aborting plan.")
                    break

                result = agent.execute_tool(tool_name, tool_args)
                print(f"Tool Output: {json.dumps(result, indent=2)}")

            print("\n--- Plan execution complete. ---")

        except KeyboardInterrupt:
            print("\nExiting.")
            break
        except Exception as e:
            print(f"A critical error occurred in the main loop: {e}")

def extract_json_from_response(response_text):
    """Finds and extracts a JSON array string from a markdown block."""
    match = re.search(r'```json\s*([\s\S]*?)\s*```', response_text)
    if match:
        return match.group(1).strip()
    if response_text.strip().startswith('['):
        return response_text.strip()
    return None

def process_user_request(user_input, agent):
    """Handles a single turn using the multi-model Plan-and-Execute strategy."""
    raw_plan_output = ""
    try:
        # 1. Planning Phase (using the Planner model)
        print("Sybil is planning...")
        plan_prompt = PLANNER_PROMPT.format(user_input=user_input)
        raw_plan_output = call_ollama(plan_prompt, model_name=PLANNER_MODEL)
        
        plan_json_str = extract_json_from_response(raw_plan_output)
        if not plan_json_str:
            raise ValueError("No valid JSON plan was found in the model's response.")
            
        plan = json.loads(plan_json_str)

        if not plan:
            # If the plan is empty, go to a conversational response with the Synthesizer
            synthesis_prompt = f"You are Samantha, an empathetic AI. Respond conversationally to the user's message: '{user_input}'"
            final_answer = call_ollama(synthesis_prompt, model_name=SYNTHESIZER_MODEL)
            print(f"Sybil: {final_answer}")
            return

        # 2. Execution Phase
        tool_outputs = []
        print("Sybil is executing the plan...")
        for step in plan:
            tool_call_str = step.get("tool_call")
            if not tool_call_str: continue

            tool_name = tool_call_str.split('(')[0]
            args_str = tool_call_str[len(tool_name)+1:-1]
            
            tool_args = {}
            if args_str:
                parts = args_str.split('=', 1)
                if len(parts) == 2:
                    key = parts[0].strip()
                    value = parts[1].strip().strip('"')
                    tool_args[key] = value
            
            print(f"Executing: {tool_call_str}")
            result = agent.execute_tool(tool_name=tool_name, tool_args=tool_args)
            tool_outputs.append({"tool_call": tool_call_str, "output": result})

        # 3. Synthesis Phase (using the Synthesizer model)
        print("Sybil is synthesizing the results...")
        synthesis_prompt = SYNTHESIS_PROMPT.format(
            user_input=user_input,
            tool_outputs=json.dumps(tool_outputs, indent=2)
        )
        final_answer = call_ollama(synthesis_prompt, model_name=SYNTHESIZER_MODEL)
        print(f"Sybil: {final_answer}")

    except Exception as e:
        print(f"Sybil: I encountered an error. Error: {e}")
        if raw_plan_output:
            print(f"--- Raw planner output ---\n{raw_plan_output}\n--------------------------")
        traceback.print_exc()

def call_ollama(prompt, model_name):
    """Sends a prompt to the Ollama API using a specific model."""
    payload = {
        "model": model_name,
        "prompt": prompt,
        "stream": False,
        "options": { "temperature": 0.0 }
    }
    response = requests.post(OLLAMA_URL, json=payload)
    response.raise_for_status()
    response_json = response.json()
    return response_json['response'].strip()
            logging.error(f"An unexpected error occurred in the main loop: {e}", exc_info=True)
            print("Sybil: I've run into an unexpected error. Please check the logs.")

if __name__ == "__main__":
    run_ark()
