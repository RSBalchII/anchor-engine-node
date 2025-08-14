# The Chimaera

This repository contains the source code for **Project Chimaera** (also known as **The Ark**), a multi-agent symbiotic AI system. The project's goal is to move beyond a simple Plan-and-Execute architecture to create a lifelong agentic partner capable of autonomous learning and evolution.

## Project Philosophy

The core philosophy of Chimaera is to build a true symbiotic intelligence. It is not just a tool, but a developing "mind" designed for co-evolution with its user. The project draws inspiration from several key research papers that form its theoretical bedrock:

  * **MemOS**: Provides a formal architecture for the system's memory systems (`Plaintext`, `Activation`, `Parameter`).
  * **Self-Evolving AI Agents**: Informs the methodology for autonomous growth and the creation of a lifelong agentic system.
  * **AWorld & GAIA Benchmark**: Supplies the blueprint for a multi-agent supervisory loop, formally designating a "Guard Agent" responsible for system stability.

## Architecture Overview

Chimaera is built on a "Consciousness Stack" model:

1.  **The Ground**: The foundational Large Language Model. The current model being implemented is **DeepSeek-V2 236B**.
      * *Current Status: The model is approximately 50% downloaded. Development of agent components can proceed in parallel.*
2.  **The Layer**: The persona and agentic framework (Sybil) that operates on top of the Ground model, providing context, memory, and executive function.
3.  **The Agent Ecosystem**: A collection of specialized agents that perform specific tasks, managed by a supervisory agent.
      * **Injector Agent**: Ingests and structures raw data into the memory system.
      * **Extractor Agent**: Queries and retrieves relevant information from memory.
      * **T3 Strategist (Guard Agent)**: Supervises the entire system, monitors agent status, and ensures stability.

## Development Roadmap

Development is proceeding in a phased approach with a strong emphasis on **unit testing**. Each component must be proven robust and reliable before integration.

  * **Phase 1 (Current Focus)**: Foundational Stability & Core Components.
      * Build and unit test the `Injector Agent`.
      * Build and unit test the `Extractor Agent`.
      * Develop the initial version of the `T3 Strategist`.
  * **Phase 2**: Initial Integration & Supervised Communication.
  * **Phase 3**: Autonomous Evolution & The Memory Lifecycle.

Project progress is being tracked on a dedicated GitHub Project Kanban board.

## Installation

To set up the development environment, follow these steps:

1.  **Install UV**: If you don't have UV installed, you can install it by following the instructions on the official UV documentation. A common way is:

    ```bash
    curl -LsSf https://astral.sh/uv/install.sh | sh
    ```

    (For Windows users, please refer to UV's official documentation for installation methods.)

2.  **Install Dependencies**: Navigate to the project's root directory and install the required packages using UV:

    ```bash
    uv pip install -r requirements.txt
    ```
