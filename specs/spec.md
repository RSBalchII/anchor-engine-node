# External Context Engine (ECE) - Specification v4.2

## 1. Project Vision: The Ark

The primary goal of the ECE project is the creation of "The Ark," a sovereign, local-first AI that functions as the Architect's **Externalized Executive Function**. It must be private, efficient, and powerful, operating entirely on local hardware without reliance on cloud services.

---

## 2. Architectural Philosophy

The ECE architecture represents a deliberate move **away from brittle, monolithic AI systems**. The core philosophy is to build a robust, self-correcting, and intelligent **multi-agent system** composed of smaller, specialized, and independently deployable components.

---

## 3. LLM Configuration

The ECE supports multiple LLM providers with a flexible configuration system. The configuration is managed through the `config.yaml` file:

```yaml
llm:
  active_provider: ollama  # Can be ollama, docker_desktop, or llama_cpp
  providers:
    ollama:
      model: "granite3.1-moe:3b-instruct-q8_0"
      api_base: "http://localhost:11434/v1"
    docker_desktop:
      model: "ai/mistral:latest"
      api_base: "http://localhost:12434/v1"
    llama_cpp:
      model_path: "/path/to/your/model.gguf"
      api_base: "http://localhost:8080/v1"
```

### Supported Providers

- **Ollama**: Default provider using local Ollama instance
- **Docker Desktop**: OpenAI-compatible endpoint for Docker-based models
- **Llama.cpp**: High-performance local inference with GGUF models

To switch providers, simply change the `active_provider` value in the configuration file.

### Setting up llama.cpp on Windows

To use the llama.cpp provider, build the llama.cpp project on Windows:

1. **Prerequisites**:
   - Git for Windows
   - CMake
   - Visual Studio Community with "Desktop development with C++" workload
   - (Optional) NVIDIA CUDA Toolkit for GPU acceleration

2. **Build Steps**:
   - Clone the repository: `git clone https://github.com/ggerganov/llama.cpp`
   - Create build directory: `mkdir build && cd build`
   - Configure CMake: `cmake .. -G "Visual Studio 17 2022"` (for CPU) or `cmake .. -G "Visual Studio 17 2022" -DLLAMA_CUBLAS=ON` (for CUDA)
   - Build: `cmake --build . --config Release`

3. **Running the Server**:
   - Start with: `server.exe -m path\to\model.gguf -c 4096 --n-gpu-layers -1 --timeout 1800`
   - For optimal performance with quantized models, use -1 for full GPU offloading
   - The --timeout parameter allows longer processing times for complex queries
   - Update config.yaml to point to the correct model path and server endpoint

4. **Model Selection Considerations**:
   - **Q4_K_M models**: Recommended for optimal performance, offering good speed and accuracy balance with lower VRAM usage
   - **F16 models**: Higher accuracy but slower performance and higher VRAM usage
   - For local development with RTX 4090, Q4_K_M models with full GPU offloading (-1) provide the best performance

5. **Context Configuration**:
   - **General Context**: Configure with --ctx-size to set the overall context window for the model
   - **Per-Request Context**: Use --n-ctx to set the context size per request (important for synthesis tasks)
   - **Synthesis Thinker**: The SynthesisThinker requires special configuration in config.yaml with synthesis_max_tokens to handle combined outputs from multiple thinkers

---

## 3. Core Technical Strategy

The system is designed to achieve state-of-the-art reasoning capabilities on local hardware by implementing principles from cutting-edge research.

### 3.1. Cognitive Model: Markovian Thinking

Inspired by the "Markovian Thinker" and "Delethink" research, the ECE's core reasoning process is **not based on an ever-growing context window**. Instead, it operates on a **Markovian principle**, where reasoning is broken down into a sequence of fixed-size "chunks."

-   **Chunked Reasoning:** An agent processes information in a small, fixed-size context window (e.g., 4k or 8k tokens).
-   **Context Reset:** After each chunk is processed, the context is reset.
-   **Textual State (Carryover):** The model is trained to generate a concise **textual summary** of its reasoning at the end of each chunk. This "carryover" is the *only* information passed to the next chunk, acting as the complete state of the reasoning process.

This approach decouples thinking length from context size, enabling **linear compute time and constant memory usage**, which is essential for achieving deep reasoning on local hardware.

### 3.4. Context Management: Prompt Truncation and Overflow Prevention

To address the critical `context overflow` issue, the ECE implements a robust prompt management system:

-   **Context-Aware Prompt Management:** The system includes a context-aware prompt manager that dynamically adjusts content based on model capabilities and context window limits.
-   **Intelligent Truncation:** Uses token counting and content preservation techniques to maintain critical information when prompts are truncated.
-   **Fallback Strategies:** Implements graceful fallback approaches (summarization, chunking) when context limits are reached.
-   **Monitoring:** Comprehensive metrics and monitoring for prompt sizes and context usage across the system.

### 3.2. Agentic Framework: The Dual-LLM PEVG Model

Our **Planner, Executor, Verifier, Generator (PEVG)** framework is powered by a dual-LLM strategy that leverages Markovian Thinking:

-   **Primary LLM (The Generator):** A powerful, general-purpose model (e.g., Phi-3) responsible for generating the final, high-quality, user-facing responses. It operates on a standard, larger context window.
-   **TRM Service (The Markovian Thinker):** A small, hyper-specialized, and extremely fast model (e.g., a fine-tuned `AI21-Jamba-Reasoning-3B`) that powers the iterative, self-corrective reasoning loop. This is our Executor and Verifier.
-   **EnhancedOrchestratorAgent**: The current implementation uses EnhancedOrchestratorAgent which implements context-aware prompt management and Markovian thinking with chunked processing. The parallel thinking approach mentioned below has been simplified in the current implementation to direct model calls and UTCP-based tool usage for better stability and performance. It includes a `process_prompt_with_context_management` method that handles prompt processing with context retrieval from the Archivist and intelligent routing between Markovian and direct processing based on prompt complexity.

### 3.5. Architecture Enhancements and Optimization Components

The ECE has been enhanced with several architectural improvements to improve maintainability, reliability, and performance:

#### 3.5.1 Centralized Configuration Management
-   **ConfigManager Class**: A unified configuration management system in `ece/common/config_manager.py` that provides consistent configuration handling across all ECE components.
-   **Validation and Versioning**: Includes configuration validation, schema versioning with automatic updates, and backup creation functionality.
-   **Dry-Run Capability**: Enables preview of configuration changes without committing them.
-   **Service Configuration**: Provides centralized handling of model server configuration updates and service-specific settings.

#### 3.5.2 Reliable Path Detection
-   **Project Root Detection**: Centralized module in `ece/common/project_root.py` for reliable project root detection across different environments.
-   **Marker File Approach**: Uses a `.project_root` file to enable consistent path resolution in development, executables, and containers.
-   **Multi-Method Detection**: Implements multiple fallback approaches to ensure path detection works consistently.

#### 3.5.3 Dynamic Service Health Monitoring
-   **Active Service Checks**: Replaced fixed waiting periods with active service availability checks using `wait_for_service` and `wait_for_agent` functions.
-   **Adaptive Startup**: Agents now wait for each other to be ready before proceeding, reducing startup time and improving reliability.
-   **Health Status Reporting**: Enhanced service status reporting with detailed availability information.

### 3.5. Markovian Thinking Architecture

To enable deep reasoning on local hardware, the ECE implements a sophisticated Markovian Thinking architecture based on the research paper "The Markovian Thinker":

-   **TRM Client Integration:** The system includes a TRM_Client class to communicate with specialized Tokenized Reasoning Model services.
-   **Iterative Refinement:** Implements a "propose -> critique -> refine" loop for improving thought processes.
-   **Chunked Reasoning:** Breaks complex problems into fixed-size chunks with textual carryover to maintain context, allowing extremely long reasoning while using bounded memory.
-   **Intelligent Routing**: Determines when to use Markovian thinking based on query complexity and length using the ReasoningAnalyzer.
-   **Carryover Management**: Maintains consistency between reasoning iterations through textual state carryover.
-   **Delethink Environment**: Implements the Delethink RL environment concept where reasoning proceeds in fixed-size chunks, and at each boundary the environment resets the context and reinitializes the prompt with a short carryover from the previous chunk.
-   **Linear Compute Scaling**: Enables linear compute with constant memory with respect to thinking length, decoupling "how long the model thinks" from "how much context it must process."
-   **Fallback Mechanisms**: Includes robust fallback to direct model response when Markovian reasoning encounters issues. (Note: The original plan mentioned fallback to "parallel thinking", but the current implementation has simplified this to direct model response as the parallel thinking architecture has been deprecated in favor of direct model calls and UTCP-based tool usage.)

### 3.6. Coordination in Multi-Agent Systems

Based on research findings from "Emergent Coordination in Multi-Agent Language Models", the ECE implements enhanced coordination between agents:

-   **Thinker Personas:** Each thinker agent is assigned a detailed persona with background, expertise, and personality traits to create stable identity-linked differentiation.
-   **Theory of Mind (ToM) Integration:** Thinker agents are instructed to consider what other agents might do and how their actions might affect the group outcome, enabling more effective collaboration.
-   **Role Complementarity:** Different thinkers are assigned complementary roles (Optimist, Pessimist, Analytical, Creative, Pragmatic, Strategic, Ethical) to ensure diverse perspectives contribute to the solution.
-   **Coordination Analysis:** The system includes metrics to measure synergy, diversity, and complementarity among thinker agents to ensure productive collective intelligence.
-   **Emergent Behavior Steering:** Prompt design and role assignments are used to steer the system from mere aggregates to higher-order collectives with coordinated behavior.

### Implementation Reality

While these coordination principles are implemented in the configuration (see thinker personas in config.yaml), the current EnhancedOrchestratorAgent implementation has shifted from the original parallel thinking model to a more streamlined approach using:
- Direct model response for simpler queries
- Markovian thinking for complex reasoning
- UTCP-based tool usage for external operations (filesystem, web search)

The multi-agent coordination through parallel thinking with specialized thinkers was part of an earlier implementation and has been simplified for better stability and performance.

### 3.7. Temporal Memory Implementation

The ECE implements a Continuous Temporal Scanning protocol with the Archivist Agent:

### 3.8. Single Executable Packaging

The ECE can be packaged into a single executable for easy distribution and deployment:

- **PyInstaller Integration**: Complete packaging solution using PyInstaller with proper hooks for FastAPI, async components, and C++ extensions
- **Docker Orchestration**: The packaged application automatically manages required Docker services (Redis, Neo4j) 
- **Process Management**: Handles launching and monitoring of all ECE agents as subprocesses
- **Component Logging**: Separate log files for launcher, Docker services, and ECE agents for easier debugging
- **Graceful Shutdown**: Proper signal handling for clean termination of all processes
- **Orphaned Container Cleanup**: Automatic cleanup of unused Docker containers while preserving active ones
- **Cross-Platform Build**: Build scripts for Windows, Linux, and macOS platforms
- **Bootstrap Verification**: Checks for required services before launching agents
- **Configuration Embedding**: Includes necessary configuration files within the executable

-   **Temporal Scanning:** The Archivist continuously monitors the Redis cache and maintains a chronological record of all processed information in the Neo4j knowledge graph.
-   **Chronological Spine:** The system creates a hierarchical temporal structure with Year, Month, and Day nodes linked through `[:HAS_MONTH]` and `[:HAS_DAY]` relationships.
-   **Memory Linking:** Each processed memory is linked to the appropriate Day node via `[:OCCURRED_AT]` relationships to provide temporal context.
-   **Continuous Monitoring:** The Archivist runs as a persistent background process that scans Redis cache for new entries at regular intervals.
-   **Error Resilience:** Comprehensive error handling and reconnection logic with retry mechanisms for transient failures.

### 3.8. Context Cache Implementation

The Context Cache component serves as a high-speed, short-term memory layer:

-   **Technology:** Leverages Redis Stack for efficient key-value storage and vector similarity search.
-   **Core Functions:** Provides store, retrieve, and delete operations with TTL support.
-   **Semantic Search:** Implements vector similarity search using Redis Stack's capabilities.
-   **Monitoring:** Includes cache hit/miss tracking for performance monitoring.
-   **Data Model:** Uses CacheEntry data model to structure data stored in Redis with fields for key, value, embedding, creation timestamp, and access count.

### 3.9. Externalized Memory & Context Loading Pattern

The ECE implements a multi-tiered context management system that preserves identity and memory external to any model:

-   **POML/JSON Persona Loading:** POML/JSON persona files (e.g., orchestrator.json) are loaded FIRST to establish foundational identity, protocols, values, and operational context before any processing begins.
-   **Redis Context Caching:** Conversation history and contextual information are preserved in a persistent Redis cache for continuity across sessions and model changes.
-   **Context Summarization:** The ENTIRE Redis cache with conversation context and new content is summarized into new entries to maintain coherent memory.
-   **Temporal Memory:** Continuous temporal scanning protocol with the Archivist Agent maintains chronological records in Neo4j knowledge graph.
-   **Tool Integration:** Tool outputs (web search, file read/write, etc.) become part of the accessible context.

#### Context Loading Order
The following sequence ensures consistent persona and memory across interactions:
1.  **POML/JSON Persona:** Loaded first to establish identity and protocols (orchestrator.json)
2.  **Redis Context:** Conversation history and contextual information from the cache
3.  **Current Prompt:** The immediate task or query from the user
4.  **Tool Outputs:** Additional information from web search, file operations, etc.

This architecture ensures that regardless of which model is selected via the dynamic model selection system, the persona defined in the POML files remains consistent and forms the foundational layer for all responses.

### 3.9. System Launchers and Utility Scripts

The ECE includes comprehensive launcher scripts for easy system management:

-   **System Launchers**: Available as `start_ecosystem.bat`, `start_ecosystem.ps1`, `start_ecosystem.sh`, and `start_ecosystem.py` for different environments
-   **Complete ECE Start**: Starts entire ECE system with all modules including Neo4j, Redis, Llama.cpp server, and all ECE agents
-   **Model-Specific Launchers**: Optimized launchers for each model in the models directory (Jamba Q4_K_M, Jamba F16, DeepSeek, Gemma, IBM Granite)
-   **Configuration Management**: Automatically detects which model is running and updates ECE configuration accordingly
-   **System Checks**: Provides bootstrap check and service status checking capabilities

#### Utility Scripts Organization
The ECE now includes a comprehensive utility scripts directory with scripts organized by function:

- `utility_scripts/`
  - `install/` - Scripts for installing packages, modules, and building components
  - `start/` - Scripts for packaging and starting the ECE application
  - Removed `llama_server/` directory - models now handled via on-demand ModelManager
  - `testing/` - Scripts for testing and profiling different ECE components

### 3.10. Model Manager State Synchronization

The ECE implements a shared state mechanism in the ModelManager class to ensure synchronization between different instances:

-   **Shared State Variables**: Class-level variables (_running_model_process, _current_model, _model_server_port, _api_base) are shared across all ModelManager instances
-   **Property-Based Access**: Properties provide access to the shared state variables ensuring consistency
-   **Global and Orchestrator Synchronization**: Ensures forge-cli model selection is visible to both global endpoints and orchestrator agents
-   **Resource Optimization**: Maintains efficient resource usage while ensuring state consistency across the system
-   **On-Demand Execution**: Preserves the model lifecycle management functionality while fixing synchronization issues

### 3.11. Global Model Manager Singleton Implementation

The ECE implements a true singleton pattern for ModelManager to ensure only one global instance across the entire system:

-   **Singleton Pattern**: ModelManager class uses __new__ method and global variable to ensure only one instance exists
-   **Initialization Protection**: Guard prevents re-initialization of singleton instance when accessed from multiple locations
-   **Global Instance Access**: All components in the system access the same ModelManager instance
-   **State Consistency**: Ensures complete consistency of model state across all system components
-   **Resource Efficiency**: Uses minimal resources by having only one instance managing all model operations

Within each directory, scripts exist for different platforms:
- `start_ecosystem.py` - Python implementation of the ecosystem starter
- `start_ecosystem.ps1` - PowerShell implementation for Windows
- `start_ecosystem.bat` - Batch implementation for Windows command line
- `start_ecosystem.sh` - Shell implementation for Linux/macOS

#### Debug Launcher
The ECE includes a debug launcher system that provides enhanced visibility into ECE agents' operations by displaying all output directly in the terminal, which is invaluable for troubleshooting and development.

##### Purpose

The debug launcher addresses the need for better visibility during ECE system operation by:
1. Showing all agent output directly in the terminal
2. Providing real-time feedback during system startup and operation
3. Enabling easier debugging of issues with agent initialization or communication
4. Allowing developers to monitor system behavior without external tools

##### Implementation

###### PowerShell Script (`utility_scripts\start\ps1\start_ecosystem.ps1`)

The PowerShell script provides the core functionality:
- Checks for required Docker services (Neo4j, Redis)
- Detects running llama.cpp servers on standard ports (8080-8094)
- Stops any existing ECE agent processes to prevent conflicts
- Starts ECE agents with visible output in the terminal
- Provides clear status messages and error handling

###### Batch Wrapper (`utility_scripts\start\bat\start_ecosystem.bat`)

The batch file provides a convenient Windows entry point:
- Sets up the correct execution environment
- Calls the PowerShell script with appropriate parameters
- Ensures PowerShell execution policy allows script execution
- Provides user-friendly interface with clear instructions

##### Features

###### Service Detection
- Automatically detects Docker installation and running status
- Checks for required Neo4j and Redis containers
- Starts containers if they're not running
- Verifies service readiness before proceeding

###### Model Server Detection
- Scans standard ports (8080-8094) for running llama.cpp servers
- Identifies which model is running on which port
- Provides feedback about detected servers

###### Process Management
- Detects existing ECE agent processes
- Offers option to stop existing processes to prevent conflicts
- Waits for proper process termination before starting new agents
- Shows process IDs of running agents

### 3.12. Building and Packaging the ECE Application

The ECE application can be built into a single executable for easy distribution and deployment.

#### Prerequisites

Before building the ECE application, ensure you have the following installed:

1. **Python 3.11+** - [Download Python](https://www.python.org/downloads/)
2. **PyInstaller** - Install with `pip install pyinstaller`
3. **uv** - [Install uv](https://github.com/astral-sh/uv) (required for running ECE agents)
4. **Docker** - [Install Docker](https://docs.docker.com/get-docker/) (required for containerized services)

#### Building the Application

##### Windows

1. Open Command Prompt or PowerShell as Administrator
2. Navigate to the project root directory
3. Run the build script:
   ```cmd
   utility_scripts\build_ece_app.bat
   ```

##### Linux/macOS

1. Open Terminal
2. Navigate to the project root directory
3. Make the build script executable (if not already):
   ```bash
   chmod +x utility_scripts/build_ece_app.sh
   ```
4. Run the build script:
   ```bash
   ./utility_scripts/build_ece_app.sh
   ```

#### Build Process

The build process performs the following steps:

1. **Validation**: Checks for required tools and files
2. **Cleaning**: Removes previous build artifacts
3. **Compilation**: Uses PyInstaller to package the application
4. **Packaging**: Creates a single executable with all dependencies

#### Output

After a successful build:

- The executable will be located in the `dist/` directory
- All necessary dependencies are bundled with the executable
- The executable can be run on systems without Python installed

#### Running the Built Application

After building, you can run the ECE application:

##### Windows
```cmd
dist\ece_app.exe
```

##### Linux/macOS
```bash
./dist/ece_app
```

#### Troubleshooting

##### Common Issues

1. **Missing Dependencies**:
   - Ensure all required Python packages are installed
   - Run `pip install -r requirements.txt` to install dependencies

2. **PyInstaller Errors**:
   - Clean previous builds with `pyinstaller --clean`
   - Check the spec file for correct paths and dependencies

3. **Permission Denied**:
   - On Linux/macOS, ensure the executable has proper permissions: `chmod +x dist/ece_app`

#### Build Logs

Build logs are available in:
- `logs/ece_launcher.log` - Main launcher logs
- `logs/docker.log` - Docker service logs
- `logs/ece_agents.log` - ECE agent logs

#### Customizing the Build

You can customize the build by modifying:
- `utility_scripts/ece_app.spec` - PyInstaller spec file
- Build scripts in `utility_scripts/` directory

For major changes to the build process, update the spec file to include additional dependencies or data files.

###### Terminal Output
- Displays all ECE agent output directly in the terminal
- Shows startup messages and status updates
- Maintains output visibility for debugging purposes
- Allows Ctrl+C interruption for clean shutdown

##### Integration

The debug launcher is integrated into the existing ECE utility script structure:
- Located in `utility_scripts/start/ps1/` and `utility_scripts/start/bat/`
- Documented in `utility_scripts/start/README.md`
- Referenced in the main project README.md

##### Future Enhancements

Potential future enhancements for the debug launcher include:
1. Log file output alongside terminal display
2. Color-coded output for different agent types or message severities
3. Filter options to show/hide specific types of messages
4. Performance metrics display during operation
5. Interactive commands for controlling running agents

##### Recent Fixes

Recent fixes that improve debug visibility:
1. UTCP Configuration: The orchestrator now connects directly to individual service UTCP endpoints rather than a centralized registry, making UTCP-related issues easier to identify and debug
2. Neo4j Authentication: Fixed authentication issues by ensuring all agents use consistent credentials, with detailed logging to help diagnose connection problems
3. Service Discovery: Improved service detection and error reporting to help identify when required services (Redis, Neo4j) are not running correctly

### 3.3. Performance Optimization: Python, Cython, and C++

To achieve the required performance, the ECE will adopt a hybrid development model:
-   **Python:** Used for high-level orchestration and non-performance-critical logic.
-   **C++/Cython:** Performance-critical components, identified through profiling with tools like `cProfile` and `snakeviz`, will be rewritten in C++ and bridged to Python using Cython.
-   **Profiling-Driven Development:** Regular performance profiling will be integrated into the development process to continuously identify and address bottlenecks as the system evolves.
-   **On-Demand Model Execution:** The ModelManager class provides resource optimization by starting models only when needed and stopping them when not in use, resulting in more efficient hardware utilization.

### 3.4. Model Management System

The ECE includes a sophisticated ModelManager system for on-demand model execution:
-   **Model Lifecycle Management:** Handles starting, stopping, and health checking of model servers on-demand.
-   **Model Discovery:** Scans the 'models' directory to identify available GGUF models with their properties (size, quantization, etc.).
-   **Dynamic Model Selection:** Allows switching between different models based on requirements.
-   **Resource Optimization:** Ensures optimal resource usage by only running models during active processing.
-   **Port Management:** Automatically assigns available ports for different model servers to prevent conflicts.
-   **Configuration Validation:** Correctly handles model paths in config.yaml, fixing common issues like double `.gguf` extensions and redundant path structures.
-   **API Base Management:** Properly manages API base URLs with appropriate port assignments for different models.

---

## 4. System Components & Deployment

-   **OrchestratorAgent:** The central Planner, delegating tasks via UTCP and managing model lifecycle through the ModelManager.
-   **Tool Agents:** `FileSystemAgent`, `WebSearchAgent`.
-   **Memory Cortex:** `Distiller`, `Archivist`, `QLearning`, and `Injector` agents.
-   **ModelManager:** Handles on-demand model execution including starting, stopping, and switching between different models.
-   **Local-First Deployment:** The system is built to run on local scripts, with a future goal of being packaged into a single executable using **PyInstaller**.
-   **Packaging Strategy:** The system will be packaged into a distributable executable with embedded configuration files and a bootstrapping mechanism to check for required services (Neo4j, Redis) before starting agents.
-   **Packaging Process:** The ECE can be packaged into a single executable using PyInstaller via build scripts (`utility_scripts/build_package.bat` for Windows, `utility_scripts/build_package.sh` for Linux/macOS). The packaging process uses `utility_scripts/ece_app.spec` which defines all necessary data files, hidden imports, and binary files to include. The packaged application includes a bootstrapping process that checks for required services before starting agents.
-   **Packaging Fixes:** Fixed ModuleNotFoundError for internal modules like '3c22db458360489351e4__mypyc' by updating PyInstaller spec file with comprehensive hidden imports configuration. The executable now successfully builds and runs with all functionality including advanced model selection and session management.
-   **Deployment Requirements:** The packaged application requires external services (Redis Server, Neo4j Database, LLM Service) to be running separately. The system now uses a decentralized UTCP implementation where each agent serves its own UTCP manual at the /utcp endpoint, eliminating the need for a centralized UTCP Registry.
-   **System Launchers:** Provides easy-to-use launchers with menu interfaces for all major ECE functions including starting complete ECE system, launching model servers, updating configuration, and checking system status.

---

## 5. Validation, Refinement, and Evolution Strategy

With the core architecture complete, the ECE transitions from implementation to validation, refinement, and continuous evolution:

### 5.1 System Validation & GUI Testing (Phase 6)
The system undergoes rigorous end-to-end testing, focusing on real-world usage scenarios to ensure all components work together seamlessly.

### 5.2 TRM Specialization (Phase 7)
The mock TRM service will be replaced with fine-tuned specialized models trained on custom datasets for improved reasoning capabilities.

### 5.3 Continuous Improvement (Phase 8)
The system enters a continuous evolution phase with:
- Active performance monitoring and optimization
- Expansion of specialized TRM models for different tasks
- Continuous curation and expansion of the knowledge graph
- Enhanced self-modification capabilities

---

## 6. Co-Evolutionary Mandate

The system must be capable of understanding and modifying its own codebase, a goal directly supported by the deep reasoning capabilities enabled by Markovian Thinking.