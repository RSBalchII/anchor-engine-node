# TASK-009: Create agent configuration
# Orchestrator - The main orchestrator model for high-level coordination
STRATEGIST_MODEL = 'mistral-nemo:12b-instruct-2407-q8_0'

# User-Facing - The fast and responsive model for the main loop
LOCUS_MODEL = 'nemotron-mini:4b-instruct-q8_0'

# Specialist Tool - The powerful coder model, loaded on demand
CODER_MODEL = 'mistral-nemo:12b-instruct-2407-q8_0'

# T2 - The lightweight model for background agents
TIER_2_WORKER_MODEL = 'nemotron-mini:4b-instruct-q8_0'

# T1 - The lightweight model for scouting
TIER_1_SCOUT_MODEL = 'nemotron-mini:4b-instruct-q8_0'

# System
MAIN_CONTEXT_FILE = 'main_context.md'

# Neo4j Configuration
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "password"