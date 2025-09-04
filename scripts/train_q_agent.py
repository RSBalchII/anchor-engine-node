
# TASK-077: Create Q-Learning training script
# TASK-077: Create Q-Learning training script
import asyncio
import os
from dotenv import load_dotenv

from src.external_context_engine.memory_management.neo4j_manager import Neo4jManager
from src.external_context_engine.memory_management.agents.q_learning_agent import QLearningGraphAgent

async def train_q_agent():
    load_dotenv() # Load environment variables

    # Initialize Neo4j Manager
    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "password")

    neo4j_manager = Neo4jManager(neo4j_uri, neo4j_user, neo4j_password)
    await neo4j_manager.connect()

    # Initialize Q-Learning Agent
    q_agent_config = {
        "learning_rate": 0.1,
        "discount_factor": 0.9,
        "epsilon": 0.1,
        "max_episodes": 100,
        "q_table_path": "./policies/graphr1_q_table.npy" # Using .npy for numpy serialization
    }
    q_learning_agent = QLearningGraphAgent(graph_manager=neo4j_manager, config=q_agent_config)

    # Dummy training data: (start_node_name, end_node_name, reward)
    # In a real scenario, this would come from actual graph interactions or logs
    training_data = [
        ("Concept A", "Concept B", 1.0),
        ("Event X", "Location Y", 0.8),
        ("Concept B", "Concept C", 0.5),
    ]

    print("Starting Q-Learning agent training...")
    await q_learning_agent.train(training_data)
    print("Q-Learning agent training complete.")

    # Save the Q-table explicitly after training
    await q_learning_agent.q_table.save()
    print(f"Q-table saved to {q_agent_config['q_table_path']}")

    await neo4j_manager.close()

if __name__ == "__main__":
    asyncio.run(train_q_agent())
