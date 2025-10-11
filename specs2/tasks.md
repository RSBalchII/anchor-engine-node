# ECE - Task List v4.1

This document outlines the high-priority tasks for the current development cycle of the External Context Engine.

---

## T-001: Local Development Transition

**Objective:** Transition the ECE from a Docker-dependent architecture to a fully local, script-based development environment.

-   **T-001.1:** Update all configuration files (`.env`, `config.yaml`) to use `localhost` for all service URLs (Redis, Neo4j, UTCP Registry, etc.).
-   **T-001.2:** Create individual startup scripts (`.bat` or `.sh`) for each agent and service (`Distiller`, `Injector`, `Archivist`, `QLearning`, `UTCP Registry`, `FileSystemAgent`, `WebSearchAgent`).
-   **T-001.3:** Create a main master script (`start_ece_local.bat`) that launches all necessary services and agents in the correct order.
-   **T-001.4:** Document the new local setup process in `README.md`.

---

## T-002: Performance Optimization with Cython/C++

**Objective:** Identify and optimize performance-critical bottlenecks by integrating C++ code via Cython.

-   **T-002.1:** Profile the ECE application using `cProfile` and `snakeviz` to identify hotspots, particularly within the `QLearningAgent` and `DistillerAgent`.
-   **T-002.2:** Rewrite the identified bottleneck functions (e.g., Q-table updates, pathfinding algorithms) in C++.
-   **T-002.3:** Create Cython wrapper files (`.pyx`) to bridge the new C++ code with the existing Python codebase.
-   **T-002.4:** Implement a `setup.py` file to compile the Cython extensions.
-   **T-002.5:** Integrate the compiled, high-performance modules back into the Python agents.

---

## T-003: Core Logic Hardening

**Objective:** Address the known prompt-sizing issue to improve system stability.

-   **T-003.1:** Analyze the `OrchestratorAgent` and its interaction with the `llama.cpp` server to identify the root cause of the `context overflow` and `invalid argument` errors.
-   **T-003.2:** Implement logic within the ECE to intelligently truncate or manage prompts, ensuring they do not exceed the `llama.cpp` server's configured context window (currently stabilized at 32k).
-   **T-003.3:** Add unit tests to verify that oversized prompts are handled gracefully.

---

## T-004: Application Packaging

**Objective:** Package the entire ECE application into a single, distributable executable.

-   **T-004.1:** Install and configure **PyInstaller**.
-   **T-004.2:** Create a main entry point script (`run_all_agents.py`) that initializes and runs all agent FastAPI applications.
-   **T-004.3:** Develop a build script (`build.bat`) that uses PyInstaller to package the application, ensuring all necessary data files (`config.yaml`, `.env`, and the `ece` directory) are included.
-   **T-004.4:** Test the generated executable to ensure all agents start and communicate correctly in the packaged environment.

