
# TASK-076: Create data ingestion script
# TASK-076: Create data ingestion script
import asyncio
import os
from dotenv import load_dotenv

from src.external_context_engine.memory_management.agents.archivist_agent import EnhancedArchivistAgent
from src.external_context_engine.memory_management.neo4j_manager import Neo4jManager
from src.external_context_engine.memory_management.agents.q_learning_agent import QLearningGraphAgent
from src.external_context_engine.memory_management.services.cache_manager import CacheManager
from src.external_context_engine.memory_management.services.llm_service import LLMService

async def ingest_data():
    load_dotenv() # Load environment variables

    # Initialize dependencies
    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "password")

    neo4j_manager = Neo4jManager(neo4j_uri, neo4j_user, neo4j_password)
    await neo4j_manager.connect()

    llm_service = LLMService(model_name=os.getenv("LLM_MODEL_NAME", "llama2"))
    q_learning_agent = QLearningGraphAgent(graph_manager=neo4j_manager) # Simplified init
    cache_manager = CacheManager() # Simplified init

    archivist_agent = EnhancedArchivistAgent(
        llm=llm_service,
        neo4j_manager=neo4j_manager,
        q_learning_agent=q_learning_agent,
        cache_manager=cache_manager
    )

    # Dummy training data
    training_data = [
        {"nodes": [{"name": "Concept A", "labels": ["Concept"]}, {"name": "Concept B", "labels": ["Concept"]}],
         "relationships": [{"start_node_id": 0, "end_node_id": 1, "type": "RELATED_TO"}]},
        {"nodes": [{"name": "Event X", "labels": ["Event"]}, {"name": "Location Y", "labels": ["Location"]}],
         "relationships": [{"start_node_id": 0, "end_node_id": 1, "type": "OCCURRED_AT"}]},
    ]

    print("Starting data ingestion...")
    for i, data_item in enumerate(training_data):
        print(f"Ingesting item {i+1}/{len(training_data)}...")
        try:
            # Note: store_data expects node IDs to be resolved. For dummy data, we'll use placeholder.
            # In a real scenario, you'd get node IDs after creating nodes.
            # For simplicity, assuming store_data handles internal ID resolution or takes names.
            await archivist_agent.store(data_item)
            print(f"Successfully ingested item {i+1}")
        except Exception as e:
            print(f"Error ingesting item {i+1}: {e}")

    await neo4j_manager.close()
    print("Data ingestion complete.")

if __name__ == "__main__":
    asyncio.run(ingest_data())
