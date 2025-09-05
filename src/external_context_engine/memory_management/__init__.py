"""
ECE Memory Management System
Phase 3 Implementation - Intelligent Memory Retrieval with Q-Learning

This module implements the Memory Management System for the External Context Engine,
providing persistent memory storage and intelligent retrieval using Q-Learning optimization.
"""

__version__ = "1.0.0"
__author__ = "Coda-ECE-Implementer-001"

# Module exports
from .agents import EnhancedArchivistAgent, QLearningAgent, ContextBuilder
from .services import CacheManager, GPUAccelerator
from .models import MemoryContext, MemoryPath

__all__ = [
    "EnhancedArchivistAgent",
    "QLearningAgent",
    "ContextBuilder",
    "CacheManager",
    "GPUAccelerator",
    "MemoryContext",
    "MemoryPath",
]
