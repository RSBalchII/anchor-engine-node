"""
Memory Management API Module

This module contains all REST and WebSocket endpoints for the Memory Management System.
"""

from .memory_endpoints import router as memory_router

__all__ = ["memory_router"]
