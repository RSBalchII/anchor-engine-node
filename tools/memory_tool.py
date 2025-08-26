

import graphr1
# from sentence_transformers import SentenceTransformer
import uuid
import logging

# --- Setup Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Initialize GraphR1 Client (Singleton pattern) ---
# This ensures we only initialize this object once.
try:
    graph_client = graphr1.Client()
    logging.info("Successfully connected to GraphR1 client.")

except Exception as e:
    logging.error(f"Failed to initialize GraphR1 client: {e}")
    graph_client = None

# --- Tool Functions ---

def store_memory(text_to_store: str, link_to_similar: bool = True) -> dict:
    """
    Stores a piece of text as a memory in the Graph-R1 graph memory.
    Optionally, it can also find similar memories and create edges to them.

    Args:
        text_to_store: The string content of the memory to be stored.
        link_to_similar: If True, creates 'related_to' edges to similar memories.

    Returns:
        A dictionary with the status and result of the operation.
    """
    if not graph_client:
        return {"status": "error", "result": "GraphR1 client is not initialized. Cannot store memory."}

    try:
        # 1. Create the new memory node
        new_memory_id = str(uuid.uuid4())
        graph_client.nodes.create(
            id=new_memory_id,
            label='MemoryNode',
            properties={'text': text_to_store, 'source': 'memory_tool'}
        )
        logging.info(f"Successfully stored memory with ID: {new_memory_id}")
        
        message = f"Memory stored successfully with ID {new_memory_id}."

        # 2. If linking is enabled, find similar memories and create edges
        if link_to_similar:
            # We search for the top 4, as one of them will likely be the node we just added.
            similar_nodes_result = graph_client.nodes.search(label='MemoryNode', query=text_to_store, top_k=4)
            
            # Filter out the node we just created from the search results
            similar_nodes = [node for node in similar_nodes_result if node.id != new_memory_id]

            if similar_nodes:
                links_created = 0
                logging.info(f"Found {len(similar_nodes)} similar memories. Creating edges...")
                for similar_node in similar_nodes:
                    graph_client.edges.create(
                        source=new_memory_id,
                        target=similar_node.id,
                        label='related_to',
                        properties={'type': 'semantic_similarity'}
                    )
                    links_created += 1
                message = f"Memory stored with ID {new_memory_id} and linked to {links_created} similar memories."

        return {"status": "success", "result": message}
    except Exception as e:
        logging.error(f"Failed to store memory: {e}")
        return {"status": "error", "result": f"An error occurred while storing memory: {e}"}

def retrieve_similar_memories(query_text: str, num_results: int = 3) -> dict:
    """
    Retrieves memories from Graph-R1 that are semantically similar to the query text.

    Args:
        query_text: The text to search for similar memories.
        num_results: The maximum number of memories to retrieve.

    Returns:
        A dictionary with the status and a list of retrieved memories.
    """
    if not graph_client:
        return {"status": "error", "result": "GraphR1 client is not initialized. Cannot retrieve memories."}
    try:
        results = graph_client.nodes.search(label='MemoryNode', query=query_text, top_k=num_results)
        retrieved_docs = [
            {"text": node.properties.get('text'), "score": node.score}
            for node in results if node.properties.get('text')
        ]

        logging.info(f"Retrieved {len(retrieved_docs)} memories for query: '{query_text}'")
        return {"status": "success", "result": retrieved_docs}
    except Exception as e:
        logging.error(f"Failed to retrieve memories: {e}")
        return {"status": "error", "result": f"An error occurred while retrieving memories: {e}"}