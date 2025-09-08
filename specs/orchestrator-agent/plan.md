
# Orchestrator Agent - plan.md

This plan outlines the implementation strategy for the `Orchestrator` agent.

### 1. Core Logic
* **Language/Framework:** Python 3.11+.
* **Cache Management:** The `Orchestrator` will use the `redis-py` library to directly interact with the Redis cache for storing and retrieving conversational context.
* **Thinker Delegation:**
    * **Registry:** A simple Python dictionary will serve as the `Thinker` registry, mapping a specialization (e.g., "math") to the internal API endpoint of the corresponding `Thinker` agent.
    * **Logic:** The delegation logic will use a rule-based approach initially. For example, it will use regex or keyword matching on the prompt to decide if a specialized `Thinker` is needed.

### 2. API & Control Flow
* **Interface:** It will have a primary internal endpoint (e.g., `POST /process_prompt`) that receives the context-enriched prompt from the (future) `PromptInjector`. The main control flow of the application—check cache, delegate to Thinker, synthesize response—will be managed within this endpoint.