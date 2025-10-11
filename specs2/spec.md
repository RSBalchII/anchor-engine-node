# External Context Engine (ECE) - Specification v4.1

## 1. Project Vision: The Ark

The primary goal of the ECE project is the creation of "The Ark," a sovereign, local-first AI that functions as the Architect's **Externalized Executive Function**. It must be private, efficient, and powerful, operating entirely on local hardware without reliance on cloud services.

---

## 2. Architectural Philosophy

The ECE architecture represents a deliberate move **away from brittle, monolithic AI systems**. The core philosophy is to build a robust, self-correcting, and intelligent **multi-agent system** composed of smaller, specialized, and independently deployable components.

This modularity allows for:
-   **Resilience:** Failures are isolated to individual agents.
-   **Scalability:** Performance can be improved by optimizing specific agents.
-   **Maintainability:** Components can be updated or replaced without disrupting the entire system.

---

## 3. Core Technical Strategy

The system is designed to achieve state-of-the-art reasoning capabilities on local hardware by implementing principles from cutting-edge research.

### 3.1. Agentic Framework: PEVG (Planner, Executor, Verifier, Generator)

We have adopted the **Planner, Executor, Verifier, Generator** model. This provides a formal, reliable structure for agentic workflows.
-   **Planner:** The `OrchestratorAgent` serves as the Planner, routing tasks based on intent.
-   **Executor:** Specialized agents (`FileSystemAgent`, `WebSearchAgent`, etc.) execute tasks.
-   **Verifier:** A dedicated `VerifierAgent` will implement the `German Precision` principle, ensuring quality and catching errors early.
-   **Generator:** The final response is formulated by a `GeneratorAgent`.

### 3.2. Cognitive Model: Tiny Recursive Models (TRM)

Inspired by Samsung's research, the **iterative self-correction loop** is the core cognitive model for our agents. This is our `Chutzpah` solution to achieve superior reasoning and planning on small, local models, bypassing the need for massive, cloud-dependent infrastructure.

### 3.3. Performance Optimization: Python, Cython, and C++

To achieve the required performance on local hardware, the ECE will adopt a hybrid development model:
-   **Python:** Used for high-level orchestration and non-performance-critical logic.
-   **C++/Cython:** Performance-critical components, identified through profiling (e.g., `QLearningAgent` calculations, `DistillerAgent` NLP processing), will be rewritten in C++ and bridged to Python using Cython.

---

## 4. System Components

### Tier 1: Orchestration
-   **OrchestratorAgent:** The central nervous system. Classifies intent and delegates tasks to Tier 2 and Tier 3 agents via the UTCP.

### Tier 2: Tool Agents
-   **FileSystemAgent:** Provides tools for reading, writing, and listing files.
-   **WebSearchAgent:** Provides tools for internet-based searches.

### Tier 3: Memory Cortex
-   **DistillerAgent:** Analyzes raw text to extract entities and relationships.
-   **ArchivistAgent:** Persists structured data to the Neo4j knowledge graph.
-   **QLearningAgent:** Intelligently traverses the knowledge graph to find optimal context paths.
-   **InjectorAgent:** Optimizes the knowledge graph through reinforcement learning.

---

## 5. Protocols & Data Flow

-   **Universal Tool Calling Protocol (UTCP):** A centralized registry allows agents to discover and call each other's tools dynamically via HTTP endpoints.
-   **Universal Context Retrieval Flow:** User prompts are immediately routed to the `ArchivistAgent` to retrieve relevant context *before* the main task is executed.
-   **Local-First Deployment:** The system is transitioning from a Docker-based architecture to a local script-based setup, with the ultimate goal of being packaged into a single, distributable executable using **PyInstaller**.

---

## 6. Co-Evolutionary Mandate

The system must be capable of understanding and modifying its own codebase. The architectural changes in v4.0 are the foundational steps toward enabling this deep, symbiotic co-evolutionary partnership between the Architect and the AI.
