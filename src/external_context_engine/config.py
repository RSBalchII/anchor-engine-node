# T3 - The Apex model for high-level synthesis
STRATEGIST_MODEL = 'deepseek-coder-v2:16b-lite-instruct-q4_0'

# User-Facing - The fast and responsive model for the main loop
LOCUS_MODEL = 'deepseek-coder-v2:16b-lite-instruct-q4_0'

# Specialist Tool - The powerful coder model, loaded on demand
CODER_MODEL = 'deepseek-coder-v2:16b-lite-instruct-fp16'

# T2 - The lightweight model for background agents
TIER_2_WORKER_MODEL = 'deepseek-coder-v2:16b-lite-instruct-q4_0'

# T1 - The lightweight model for scouting
TIER_1_SCOUT_MODEL = 'deepseek-coder-v2:16b-lite-instruct-q4_0'

# System
MAIN_CONTEXT_FILE = 'main_context.md'

# Neo4j Configuration
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "password"