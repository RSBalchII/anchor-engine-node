"""
Dependency Injection Service

Provides dependency injection for FastAPI endpoints and agent initialization.
"""

import logging
from typing import Optional
from functools import lru_cache

# Import only what we need at the module level - avoid importing from agents here
from .cache_manager import CacheManager
from .gpu_accelerator import GPUAccelerator

logger = logging.getLogger(__name__)

# Global instances (singleton pattern)
_archivist_agent: Optional[object] = None
_q_learning_agent: Optional[object] = None
_context_builder: Optional[object] = None
_cache_manager: Optional[CacheManager] = None
_gpu_accelerator: Optional[GPUAccelerator] = None
_graph_manager = None  # Will be initialized from db_manager


@lru_cache()
def get_config():
    """Get configuration from environment and config files."""
    import yaml
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    # Load config.yaml
    config_path = os.getenv("CONFIG_PATH", "config.yaml")
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)
    
    # Get memory management config
    mm_config = config.get("memory_management", {})
    
    # Override with environment variables
    mm_config.setdefault("cache", {})["redis_url"] = os.getenv("REDIS_URL", mm_config.get("cache", {}).get("redis_url"))
    
    return mm_config


def get_graph_manager():
    """Get Neo4j graph manager instance."""
    global _graph_manager
    
    if _graph_manager is None:
        try:
            from ...tools.utils.db_manager import db_manager
            _graph_manager = db_manager
        except ImportError:
            logger.error("Could not import db_manager")
            # Create a mock manager for testing
            class MockDBManager:
                async def execute_query(self, query, params=None):
                    return []
                def close(self):
                    pass
            _graph_manager = MockDBManager()
    
    return _graph_manager


def get_cache_manager() -> CacheManager:
    """Get or create cache manager instance."""
    global _cache_manager
    
    if _cache_manager is None:
        config = get_config()
        cache_config = config.get("cache", {})
        _cache_manager = CacheManager(cache_config)
        logger.info("Cache Manager initialized")
    
    return _cache_manager


def get_gpu_accelerator() -> GPUAccelerator:
    """Get or create GPU accelerator instance."""
    global _gpu_accelerator
    
    if _gpu_accelerator is None:
        config = get_config()
        gpu_config = config.get("gpu", {})
        _gpu_accelerator = GPUAccelerator(gpu_config)
        logger.info("GPU Accelerator initialized")
    
    return _gpu_accelerator


def get_q_learning_agent():
    """Get or create Q-Learning agent instance."""
    global _q_learning_agent
    
    if _q_learning_agent is None:
        # Local import to avoid circular dependencies
        from ..agents.q_learning_agent import QLearningAgent
        
        config = get_config()
        ql_config = config.get("q_learning", {})
        graph_manager = get_graph_manager()
        
        _q_learning_agent = QLearningAgent(
            graph_manager=graph_manager,
            config=ql_config
        )
        logger.info("Q-Learning Agent initialized")
    
    return _q_learning_agent


def get_context_builder():
    """Get or create context builder instance."""
    global _context_builder
    
    if _context_builder is None:
        # Local import to avoid circular dependencies
        from ..agents.context_builder import ContextBuilder
        
        config = get_config()
        cb_config = config.get("context_builder", {})
        
        # Get LLM (simplified for now)
        llm = get_llm()
        
        _context_builder = ContextBuilder(
            llm=llm,
            tokenizer=None,  # Will use estimation
            config=cb_config
        )
        logger.info("Context Builder initialized")
    
    return _context_builder


def get_archivist_agent():
    """Get or create Enhanced Archivist agent instance."""
    global _archivist_agent
    
    if _archivist_agent is None:
        # Local import to avoid circular dependencies
        from ..agents.archivist_agent import EnhancedArchivistAgent
        
        config = get_config()
        arch_config = config.get("agents", {}).get("enhanced_archivist", {})
        
        # Get dependencies
        llm = get_llm()
        graph_manager = get_graph_manager()
        q_learning_agent = get_q_learning_agent()
        cache_manager = get_cache_manager()
        gpu_accelerator = get_gpu_accelerator()
        
        _archivist_agent = EnhancedArchivistAgent(
            llm=llm,
            neo4j_manager=graph_manager,
            q_learning_agent=q_learning_agent,
            cache_manager=cache_manager,
            gpu_accelerator=gpu_accelerator,
            config=arch_config
        )
        logger.info("Enhanced Archivist Agent initialized")
    
    return _archivist_agent


def get_llm():
    """Get LLM instance for agents."""
    # Simplified LLM getter - in production, this would use Ollama or other providers
    import os
    
    class SimpleLLM:
        """Simple LLM wrapper for testing."""
        
        def invoke(self, prompt: str) -> str:
            """Invoke LLM with prompt."""
            # This is a placeholder - real implementation would use Ollama
            if "extract key concepts" in prompt.lower():
                return '{"concepts": ["memory", "context", "query"], "intent": "factual"}'
            elif "summarize" in prompt.lower():
                return "This is a summary of the provided information."
            return "LLM response placeholder"
        
        async def ainvoke(self, prompt: str) -> str:
            """Async invoke."""
            return self.invoke(prompt)
    
    # In production, return actual LLM client
    # from ollama import Client
    # return Client(base_url=os.getenv("OLLAMA_URL", "http://localhost:11434"))
    
    return SimpleLLM()


def reset_singletons():
    """Reset all singleton instances (mainly for testing)."""
    global _archivist_agent, _q_learning_agent, _context_builder
    global _cache_manager, _gpu_accelerator, _graph_manager
    
    _archivist_agent = None
    _q_learning_agent = None
    _context_builder = None
    _cache_manager = None
    _gpu_accelerator = None
    _graph_manager = None
    
    logger.info("All singletons reset")