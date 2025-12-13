import sys
import os
from pathlib import Path

# Add backend to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from src.config import settings
    print(f"Neo4j URI from settings: {settings.neo4j_uri}")
    print(f"Neo4j URI from env: {os.environ.get('NEO4J_URI')}")
    print(f"Redis URL from settings: {settings.redis_url}")
    print(f"Redis URL from env: {os.environ.get('REDIS_URL')}")
except Exception as e:
    print(f"Failed to load config: {e}")
