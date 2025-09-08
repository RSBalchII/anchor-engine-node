
# Distiller Agent - plan.md

This plan outlines the implementation strategy for the `Distiller` agent.

### 1. Core Logic
* **Language/Framework:** Python 3.11+.
* **Scheduling:** We will use a simple scheduling library like `APScheduler` to run the distillation process on a configurable timer (e.g., every 5 minutes).
* **Cache Interaction:** The agent will use the `redis-py` library to connect to the Redis instance and fetch the contents of the context cache.
* **NLP Processing:** We will use **spaCy** for Named Entity Recognition (NER). We'll load a pre-trained model to identify entities (people, places, concepts) and their relationships from the raw text.

### 2. API
* **Interface:** The agent will act as a client. Its final action will be to make an internal API call to a specific endpoint on the `Archivist` agent, posting the structured JSON data it has created.