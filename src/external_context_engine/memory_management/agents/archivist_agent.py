# TASK-006: Enhance Archivist Agent core
# TASK-011: Implement memory query endpoint
# TASK-012: Implement memory store endpoint
# TASK-023: Implement embedding generator
from sentence_transformers import SentenceTransformer
from typing import Any, Dict, List
from src.external_context_engine.memory_management.models.memory_context import MemoryContext
from src.external_context_engine.memory_management.services.llm_service import LLMService
from src.external_context_engine.memory_management.services.neo4j_manager import Neo4jManager
from src.external_context_engine.memory_management.agents.q_learning_agent import QLearningGraphAgent
from src.external_context_engine.memory_management.services.cache_manager import CacheManager

class EnhancedArchivistAgent:
    """
    The Enhanced Archivist Agent is responsible for managing the knowledge graph.
    It processes queries to retrieve context and stores new information.
    """
    def __init__(self, llm: LLMService, neo4j_manager: Neo4jManager, q_learning_agent: QLearningGraphAgent, cache_manager: CacheManager):
        """
        Initializes the EnhancedArchivistAgent.

        Args:
            llm: The language model for concept extraction.
            neo4j_manager: The manager for interacting with the Neo4j database.
            q_learning_agent: The agent for finding optimal paths in the graph.
            cache_manager: The manager for caching results.
        """
        self.llm = llm
        self.graph_db = neo4j_manager
        self.qla = q_learning_agent
        self.cache = cache_manager
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2').cuda() # This will be enabled when GPU is confirmed

    async def process_query(self, query: str) -> MemoryContext:
        # 1. Parse query and extract concepts
        concepts = await self.llm.extract_concepts(query)

        # 2. Generate embeddings
        query_embedding = self.embedder.encode(query, convert_to_tensor=True)

        # 3. Find relevant nodes in graph
        relevant_nodes = await self.graph_db.find_relevant_nodes(query_embedding)

        # 4. Task Q-Learning Agent for optimal paths
        # Assuming relevant_nodes are suitable as start_nodes for QLA
        paths = await self.qla.find_paths(relevant_nodes)

        # 5. Build context from paths
        context = MemoryContext(paths)
        return context

    async def store(self, structured_data: Dict[str, Any]) -> List[str]:
        # 1. Create/update nodes for entities
        # 2. Create/update relationships between them
        created_ids = await self.graph_db.store_data(structured_data)
        return created_ids