# ECE - Development Plan v4.1

This document outlines the phased development plan for the External Context Engine, focusing on the transition to a local, high-performance architecture.

---

## Phase 1: Transition to Local-First Development (Current Focus)

**Goal:** Eliminate the Docker dependency for core development and enable a streamlined, script-based local workflow.

1.  **Configuration Update:** Modify all service URLs in `.env` and `config.yaml` to point to `localhost`.
2.  **Script Creation:** Develop individual and master startup scripts for all agents and services.
3.  **Testing:** Thoroughly test the local script-based setup to ensure all agents can communicate correctly.
4.  **Documentation:** Update the main `README.md` to reflect the new local setup process.

---

## Phase 2: Performance Profiling and Optimization

**Goal:** Identify and refactor performance bottlenecks using C++ and Cython.

1.  **Profiling:** Use `cProfile` and `snakeviz` to conduct a thorough performance analysis of the entire ECE stack under load.
2.  **C++ Implementation:** Rewrite the most computationally expensive functions (identified in profiling) in C++. The initial focus will be on the `QLearningAgent`.
3.  **Cython Integration:** Bridge the new C++ code into the Python application using Cython extensions.
4.  **Benchmarking:** Re-run performance tests to measure the impact of the optimizations.

---

## Phase 3: Core Logic and Stability Enhancements

**Goal:** Resolve the critical `context overflow` issue and improve the overall stability of the system.

1.  **Prompt Management:** Implement robust prompt truncation and management logic within the `OrchestratorAgent`.
2.  **Error Handling:** Improve error handling and reporting across all agents.
3.  **Integration Testing:** Create a suite of integration tests to validate the stability of the system with the new prompt management logic.

---

## Phase 4: Packaging and Distribution

**Goal:** Package the ECE into a single, distributable executable for ease of deployment.

1.  **PyInstaller Setup:** Configure PyInstaller and create a main entry point script to run all agents.
2.  **Build Automation:** Develop a build script to automate the PyInstaller packaging process.
3.  **Distribution Testing:** Test the final executable on a clean machine to ensure it runs correctly without any external dependencies other than Redis and Neo4j.
