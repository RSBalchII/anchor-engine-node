"""
This module provides memory storage and retrieval capabilities for The Ark.
NOTE: This is a placeholder implementation.
"""
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# This is a simple in-memory store. A real implementation would use a database or a file.
_memory_storage = []

def store_memory(text_to_store: str) -> dict:
    """
    Stores a piece of text in the agent's memory.
    """
    logging.info(f"Storing memory: '{text_to_store}'")
    try:
        _memory_storage.append(text_to_store)
        return {"status": "success", "result": "Memory stored successfully."}
    except Exception as e:
        logging.error(f"Failed to store memory: {e}")
        return {"status": "error", "result": str(e)}

def retrieve_similar_memories(query_text: str) -> dict:
    """
    Retrieves memories that are similar to the query text.
    NOTE: This is a placeholder and just returns the most recent memories.
    A real implementation would use vector similarity search.
    """
    logging.info(f"Retrieving memories similar to: '{query_text}'")
    try:
        # Simple implementation: return the last 5 memories.
        num_memories = min(len(_memory_storage), 5)
        similar_memories = _memory_storage[-num_memories:]
        return {"status": "success", "result": similar_memories}
    except Exception as e:
        logging.error(f"Failed to retrieve memories: {e}")
        return {"status": "error", "result": str(e)}

# /tools/memory_tool.py

import chromadb
from sentence_transformers import SentenceTransformer
import uuid
import logging

# --- Setup Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Initialize ChromaDB Client and Embedding Model (Singleton pattern) ---
# This ensures we only initialize these expensive objects once.
try:
    client = chromadb.HttpClient(host='localhost', port=8000)
    # Using a lightweight but effective embedding model that runs locally.
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # The collection is where we'll store the memories.
    # The embedding function is automatically handled by ChromaDB if specified like this.
    collection = client.get_or_create_collection(
        name="sybil_memories_main",
        metadata={"hnsw:space": "cosine"} # Using cosine similarity for finding memories.
    )
    logging.info("Successfully connected to ChromaDB and initialized memory collection.")

except Exception as e:
    logging.error(f"Failed to initialize ChromaDB client or embedding model: {e}")
    client = None
    collection = None
    embedding_model = None

# --- Tool Functions ---

def store_memory(text_to_store: str) -> dict:
    """
    Stores a piece of text as a memory in the ChromaDB vector store.

    Args:
        text_to_store: The string content of the memory to be stored.

    Returns:
        A dictionary with the status and result of the operation.
    """
    if not collection:
        return {"status": "error", "result": "Memory system is not initialized."}
    
    try:
        memory_id = str(uuid.uuid4())
        # ChromaDB automatically uses the collection's embedding function to convert the document text.
        collection.add(
            documents=[text_to_store],
            ids=[memory_id]
        )
        logging.info(f"Successfully stored memory with ID: {memory_id}")
        return {"status": "success", "result": f"Memory stored successfully with ID {memory_id}."}
    except Exception as e:
        logging.error(f"Failed to store memory: {e}")
        return {"status": "error", "result": f"An error occurred while storing memory: {e}"}

def retrieve_similar_memories(query_text: str, num_results: int = 3) -> dict:
    """
    Retrieves memories from ChromaDB that are semantically similar to the query text.

    Args:
        query_text: The text to search for similar memories.
        num_results: The maximum number of memories to retrieve.

    Returns:
        A dictionary with the status and a list of retrieved memories.
    """
    if not collection:
        return {"status": "error", "result": "Memory system is not initialized."}

    try:
        results = collection.query(
            query_texts=[query_text],
            n_results=num_results
        )
        # Extract just the documents from the nested result structure
        retrieved_docs = results.get('documents', [[]])[0]
        
        logging.info(f"Retrieved {len(retrieved_docs)} memories for query: '{query_text}'")
        return {"status": "success", "result": retrieved_docs}
    except Exception as e:
        logging.error(f"Failed to retrieve memories: {e}")
        return {"status": "error", "result": f"An error occurred while retrieving memories: {e}"}