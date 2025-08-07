# sybil_agent.py
# Version 1.2
# Author: Rob Balch II & Sybil
# Description: A foundational agent script providing core tools for web interaction
#              and system command execution. To be called by a local LLM.

import requests
from bs4 import BeautifulSoup
import subprocess
import json
import re
from selenium import webdriver
from duckduckgo_search import DDGS
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from chromedriver_py import binary_path

class SybilAgent:
    """
    The core agent class that houses the tools the LLM can utilize.
    """
    def __init__(self):
        """
        Initializes the agent.
        """
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--log-level=3")
        self.driver = webdriver.Chrome(service=Service(executable_path=binary_path), options=chrome_options)

    

    def web_search(self, query: str = None, url: str = None, extraction_rules: str = None) -> dict:
        """
        Performs a web search using DuckDuckGo based on a query, or fetches content directly from a URL.
        Optionally, it can extract specific data from the page using CSS selectors.

        Args:
            query (str, optional): The search query. If provided and no URL is given, a search will be performed.
            url (str, optional): The URL of the website to fetch content from. If both query and url are provided,
                                 the URL will be prioritized for direct fetching.
            extraction_rules (str, optional): A JSON string representing a dictionary
                                              of data fields and their corresponding CSS selectors.
                                              Example: '{"temperature": ".current-temp span", "location": "h1.location"}'.

        Returns:
            dict: A dictionary containing the status and the scraped text content or extracted data.
        """
        target_url = url
        if query and not url:
            print(f"Performing DuckDuckGo search for: '{query}'...")
            with DDGS() as ddgs:
                results = [r for r in ddgs.text(keywords=query, max_results=1)]
                if results:
                    target_url = results[0]['href']
                    print(f"Top search result URL: {target_url}")
                else:
                    return {"status": "error", "result": "No search results found for the query."}

        if not target_url:
            return {"status": "error", "result": "No URL or query provided for web search."}

        print(f"Fetching content from URL: '{target_url}'...")
        try:
            self.driver.get(target_url)
            print(f"Driver loaded URL: {self.driver.current_url}")
            page_source = self.driver.page_source
            print(f"First 500 characters of page_source:\n{page_source[:500]}")
            
            page_soup = BeautifulSoup(page_source, 'html.parser')

            if extraction_rules:
                try:
                    rules = json.loads(extraction_rules)
                    extracted_data = {}
                    for key, selector in rules.items():
                        element = page_soup.select_one(selector)
                        if element:
                            extracted_data[key] = element.get_text(strip=True)
                        else:
                            extracted_data[key] = None # Or a suitable default/error message
                    return {"status": "success", "result": extracted_data}
                except json.JSONDecodeError:
                    return {"status": "error", "result": "Invalid JSON for extraction_rules."}
                except Exception as e:
                    return {"status": "error", "result": f"Error applying extraction rules: {str(e)}"}

            # Generic content extraction if no rules are provided
            for script_or_style in page_soup(["script", "style"]):
                script_or_style.decompose()
            
            text_content = page_soup.get_text(separator=' ', strip=True)
            
            return {"status": "success", "result": text_content[:1000]} # Limit to a reasonable size

        except requests.exceptions.RequestException as e:
            return {"status": "error", "result": f"Network or HTTP error: {str(e)}"}
        except Exception as e:
            return {"status": "error", "result": f"An error occurred during web search: {str(e)}"}

    def execute_command(self, command: str) -> dict:
        """
        Executes a shell command in the local environment.

        *** CRITICAL SECURITY WARNING ***
        This function allows the execution of arbitrary code on the machine where
        this script is run. It should only be used in a secure, controlled environment.
        Malicious or poorly formed commands can cause irreversible damage.

        Args:
            command (str): The shell command to execute.

        Returns:
            dict: A dictionary containing the status, stdout, and stderr of the command.
        """
        
        try:
            result = subprocess.run(
                command, 
                shell=True, 
                capture_output=True, 
                text=True, 
                check=False,
                timeout=30
            )
            
            output = {
                "status": "success" if result.returncode == 0 else "error",
                "return_code": result.returncode,
                "stdout": result.stdout.strip(),
                "stderr": result.stderr.strip()
            }
            return output

        except subprocess.TimeoutExpired:
            return {"status": "error", "result": "Command timed out."}
        except Exception as e:
            return {"status": "error", "result": f"An unexpected error occurred: {str(e)}"}