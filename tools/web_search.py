"""
This module provides web search functionality using DuckDuckGo.
"""
from ddgs import DDGS
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def web_search(query: str) -> dict:
    """
    Performs a web search using DuckDuckGo and returns a dictionary of results.
    """
    logging.info(f"Performing web search for: '{query}'")
    try:
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=5):
                results.append(r)

        if not results:
            logging.warning(f"No search results found for query: '{query}'")
            return {"status": "success", "result": "No search results found."}

        return {"status": "success", "result": results}

    except Exception as e:
        logging.error(f"An error occurred during web search: {e}")
        return {"status": "error", "result": str(e)}
