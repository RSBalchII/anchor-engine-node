import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.abspath('backend'))

from src.memory.neo4j_store import Neo4jStore

async def wipe():
    print("Connecting to Neo4j...")
    store = Neo4jStore()
    await store.initialize()
    print("Wiping graph...")
    await store.neo4j_driver.execute_query('MATCH (n) DETACH DELETE n')
    await store.close()
    print('✅ Graph Wiped.')

if __name__ == "__main__":
    asyncio.run(wipe())
