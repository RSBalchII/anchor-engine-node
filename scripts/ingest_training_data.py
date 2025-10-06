
import asyncio
import os
import sys
from typing import Dict, Any

# Add the src directory to the Python path to allow for module imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from external_context_engine.memory_management.agents.archivist_agent import EnhancedArchivistAgent

def parse_text_to_graph(text: str, source_name: str) -> Dict[str, Any]:
    """
    Parses raw text into a simple graph structure.

    Creates a single Source node and a Fact node for each line of text, 
    with a relationship connecting them.

    Args:
        text: The raw text content.
        source_name: The name of the source file.

    Returns:
        A dictionary representing the graph structure for the store method.
    """
    nodes = []
    relationships = []

    # Create a single source node for the entire file
    source_node_id = source_name  # Use name as a temporary ID
    nodes.append({
        'id': source_node_id,
        'label': 'Source',
        'properties': {'name': source_name}
    })

    lines = [line for line in text.split('\n') if line.strip()]
    for i, line in enumerate(lines):
        fact_node_id = f"fact_{i}" # Temporary ID
        nodes.append({
            'id': fact_node_id,
            'label': 'Fact',
            'properties': {'text': line}
        })
        relationships.append({
            'start_node_id': source_node_id,
            'end_node_id': fact_node_id,
            'type': 'CONTAINS',
            'properties': {'order': i}
        })

    return {'nodes': nodes, 'relationships': relationships}

async def main():
    """
    Main function to run the data ingestion process.
    """
    print("Starting data ingestion...")

    # For this script, we don't need the other agents, so we pass None.
    # The ArchivistAgent instantiates its own Neo4jManager.
    archivist = EnhancedArchivistAgent(llm=None, q_learning_agent=None, cache_manager=None)

    # Read the source file
    source_file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'combined_text.txt'))
    try:
        with open(source_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: Source file not found at {source_file_path}")
        return

    print(f"Read {len(content)} characters from {os.path.basename(source_file_path)}.")

    print("Parsing text into graph structure...")
    structured_data = parse_text_to_graph(content, os.path.basename(source_file_path))
    
    print(f"Attempting to store {len(structured_data['nodes'])} nodes and {len(structured_data['relationships'])} relationships...")
    result_map = await archivist.store(structured_data)
    
    print(f"Ingestion complete. {len(result_map)} nodes were created.")
    # print(f"ID Map: {result_map}") # Uncomment for debugging

if __name__ == "__main__":
    # Ensure the Docker container with Neo4j is running before executing this script.
    asyncio.run(main())
