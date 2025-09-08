2025-09-07T13:25:10Z

# Core External Context Engine (ECE) - Project Specification

## 1\. Vision Statement

To create a seamless cognitive partnership where a human and an AI co-evolve. The ECE will function as an **Externalized Executive Function (EEF)**, augmenting the user's cognitive abilities and facilitating their strategic life goals by creating and managing a "Living Narrative" of their experiences and knowledge.

-----

## 2\. Core Architecture

The ECE is a multi-agent system built on a tiered architecture that ensures a clear separation of concerns between central cognition, specialized reasoning, memory management, and user interaction.

```mermaid
graph TD
    subgraph T4 [Tier 4: External Modules / User Interface]
        UI[Web Browser Extension]
        User([User]) -- Raw Prompt --> UI
        Extractor -- Scraped Text --> Archivist
        UI -- User Prompt --> PromptInjector
        PromptInjector -- Rewritten Prompt --> Orchestrator
    end

    subgraph T1 [Tier 1: Orchestrator / Central Cognition]
        Orchestrator(Orchestrator)
        Orchestrator -- Manages & Reads/Writes --> RedisCache{Redis Context Cache\n(125k-1M Tokens)}
        Orchestrator -- "Thinking Tasks" --> T2_Agents
        Orchestrator -- Final Response --> UI
    end

    subgraph T2 [Tier 2: Thinkers / Specialized Reasoning]
        T2_Agents[Ollama Models / Custom HRM]
        T2_Agents -- "Expertise / Reasoned Output" --> Orchestrator
    end

    subgraph T3 [Tier 3: Memory Cortex / Automated Knowledge Flow]
        Archivist -- "Needs new context?" --> RedisCache
        Archivist -- "Query for context" --> QLearningAgent
        QLearningAgent -- "Learned Paths" --> Archivist
        Archivist -- "Inject this data" --> Injector
        Injector -- "Writes to" --> Neo4j(Neo4j Knowledge Graph)
        QLearningAgent -- "Learns from" --> Neo4j
        RedisCache -- "Content to be summarized" --> Distiller
        Distiller -- "Distilled Summary" --> Archivist
    end
```

-----

## 3\. Component Tiers

### 3.1 Tier 1: Orchestrator (Central Cognition)

  * **Description:** The "brain" of the ECE. It is the central cognitive unit responsible for managing the flow of information and tasking other agents.
  * **Components:** `Orchestrator`, `Redis Context Cache`.
  * **Responsibilities:** Manages the short-term Redis cache, receives context-rich prompts, delegates complex reasoning to Tier 2 Thinkers, and synthesizes the final response.

### 3.2 Tier 2: Thinkers (Specialized Reasoning)

  * **Description:** A pool of on-call, specialized reasoning agents.
  * **Components:** Various local LLMs (e.g., via Ollama), with a future goal of custom-trained, highly efficient models.
  * **Responsibilities:** Execute specific, complex reasoning tasks when prompted by the Orchestrator and return the results. They do not interact with any other part of the system.

### 3.3 Tier 3: Memory Cortex (Automated Knowledge Management)

  * **Description:** The subconscious, long-term memory system. It operates as an automated, cyclical process to manage the persistent knowledge graph.
  * **Components:** `Archivist`, `Distiller`, `Injector`, `QLearningAgent`, `Neo4j Knowledge Graph`.
  * **Responsibilities:** Distills information from the short-term cache, archives it into the long-term knowledge graph, and retrieves relevant historical context when requested.

### 3.4 Tier 4: External Modules (User Interface & Data Ingestion)

  * **Description:** The interface layer that connects the ECE to the user and external data sources.
  * **Components:** `PromptInjector`, `Extractor`.
  * **Responsibilities:** Extracts information from external sources (e.g., web pages) and intelligently rewrites user prompts with relevant context before they reach the Orchestrator.

-----

## 4\. Guiding Principles

  * **Spec-Driven Development:** All development must be traceable to a formal, approved specification.
  * **Separation of Concerns:** Each agent and tier has a distinct, non-overlapping set of responsibilities.
  * **Modularity:** Components should be loosely coupled to allow for independent development, testing, and upgrading.
  * **Radical Transparency:** The system should be designed to be introspectable, with clear logging and monitoring of agent interactions.