from sybill_agent import SybilAgent

import sys
import re
import json

# Pre-defined extraction rules for common queries
WEATHER_EXTRACTION_RULES = json.dumps({
    "temperature": ".wr-value--temperature .wr-value--temperature--c",
    "location": "h1.wr-c-location__name",
    "condition": ".wr-weather-type__text",
    "precipitation_forecast": ".wr-c-forecast__table-type--precipitation-probability-value"
})

# This main block is for direct testing of the agent's tools.
# The actual implementation will involve a master script calling these functions.
if __name__ == '__main__':
    agent = SybilAgent()
    
    if len(sys.argv) > 1:
        # Command-line mode
        command = " ".join(sys.argv[1:])
        if command.lower().startswith('search:') :
            query = command[len('search:'):].strip()
            if "weather" in query.lower():
                result = agent.web_search(query, extraction_rules=WEATHER_EXTRACTION_RULES)
            else:
                result = agent.web_search(query)
            # The web_search function now returns a dictionary
            if result['status'] == 'success':
                print(result['result'])
            else:
                print(f"Error: {result['result']}")
        elif command.lower().startswith('search_extract:') :
            command_args = command[len('search_extract:'):].strip()
            query_match = re.search(r'query=(.*?)(?:\s+rules=|$)', command_args)
            rules_match = re.search(r'rules=(.*)', command_args)

            query = query_match.group(1).strip() if query_match else ""
            extraction_rules = rules_match.group(1).strip() if rules_match else None

            if not query:
                print("Invalid command format. Query is missing. Use 'search_extract: query=<query_string> rules=<json_extraction_rules>'.")
            else:
                if "weather" in query.lower():
                    extraction_rules = WEATHER_EXTRACTION_RULES
                result = agent.web_search(query, extraction_rules=extraction_rules)
                if result['status'] == 'success':
                    print(result['result'])
                else:
                    print(f"Error: {result['result']}")
        elif command.lower().startswith('exec:') :
            cmd = command[len('exec:'):].strip()
            result = agent.execute_command(cmd)
            # The execute_command function also returns a dictionary
            if result['status'] == 'success':
                if result['stdout']:
                    print(result['stdout'])
                if result['stderr']:
                    print(f"Error: {result['stderr']}")
            else:
                # Handle cases where the command execution itself failed
                if result.get('stderr'):
                     print(f"Execution failed with return code {result['return_code']}: {result['stderr']}")
                else:
                     print(f"An unexpected error occurred: {result.get('result', 'No details')}")
        else:
            print("Invalid command format. Use 'search: <query>' or 'exec: <command>'.")
    else:
        # Interactive mode
        print("Sybil Agent toolset initialized. Enter commands for testing.")
        print("Example commands:")
        print("  search: what is the weather in albuquerque")
        print("  exec: dir")
        print("  exit")
        
        while True:
            try:
                user_input = input("> ")
                if user_input.lower() in ['exit', 'quit']:
                    break
                
                if user_input.lower().startswith('search:') :
                    query = user_input[len('search:'):].strip()
                    result = agent.web_search(query)
                    # The web_search function now returns a dictionary
                    if result['status'] == 'success':
                        print(result['result'])
                    else:
                        print(f"Error: {result['result']}")
                elif user_input.lower().startswith('exec:') :
                    cmd = user_input[len('exec:'):].strip()
                    result = agent.execute_command(cmd)
                    # The execute_command function also returns a dictionary
                    if result['status'] == 'success':
                        if result['stdout']:
                            print(result['stdout'])
                        if result['stderr']:
                            print(f"Error: {result['stderr']}")
                    else:
                        # Handle cases where the command execution itself failed
                        if result.get('stderr'):
                             print(f"Execution failed with return code {result['return_code']}: {result['stderr']}")
                        else:
                             print(f"An unexpected error occurred: {result.get('result', 'No details')}")

                else:
                    print("Invalid command format. Use 'search: <query>' or 'exec: <command>'.")

            except KeyboardInterrupt:
                print("\nExiting.")
                break

