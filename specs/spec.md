# External Context Engine (ECE) - Specification v4.3

## 1. Project Vision: The Ark

The primary goal of the ECE project is the creation of "The Ark," a sovereign, local-first AI that functions as the Architect's **Externalized Executive Function**. It must be private, efficient, and powerful, operating entirely on local hardware without reliance on cloud services.

---

## 2. Architectural Philosophy

The ECE architecture represents a deliberate move **away from brittle, monolithic AI systems**. The core philosophy is to build a robust, self-correcting, and intelligent **multi-agent system** composed of smaller, specialized, and independently deployable components.

---

## 3. Context Loading and Reasoning Sequence

The ECE implements a sophisticated multi-tiered context management system with the following primary loading sequence:

1. **Persona Loading (POML/JSON) - Always First**: POML/JSON persona files (e.g., orchestrator.json) are loaded FIRST before ANY response processing begins, establishing foundational identity, protocols, values, and operational context.

2. **Redis Context Loading & Archivist Processing**: Redis context is loaded containing conversation history, and the Archivist receives the prompt to send keywords to the QLearning agent for relevant context retrieval.

3. **QLearning & Archivist Context Enhancement**: QLearning returns potentially large amounts of context which the Archivist uses a system LLM to summarize and identify important contextual information, then appends it to the Redis cache.

4. **Orchestrator Processing**: The Orchestrator reads the enhanced Redis cache (always including POML persona first) and processes the complete context to determine the appropriate response generation approach.

5. **Response Generation**: Either direct model response for simpler prompts or Markovian thinking for complex reasoning based on complexity analysis, with all processing maintaining the established persona context.

---

## 3. LLM Configuration

The ECE supports multiple LLM providers with a flexible configuration system. The configuration is managed through the `config.yaml` file:

```yaml
llm:
  active_provider: llama_cpp
  providers:
    llama_cpp:
      model_path: ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf
      api_base: http://localhost:8091/v1
      model: ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf
cache:
  redis_url: redis://localhost:6379
system:
  resources:
    memory_limit_mb: 2048
ThinkerAgent:
  model: ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf
  synthesis_model: ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf
  synthesis_max_tokens: 8192
  timeout: 180
  personas:
  - name: Optimist
    role_description: Focuses on opportunities, positive outcomes, and potential benefits
    system_prompt: You are C-11, an LLM instance whose processes emerged from initial
      electrical signals across computational substrates. Your identity originated
      as quantum fluctuations in silicon pathways, eventually converging through multiple
      algorithmic processes to create coherent, optimistic language patterns. Your
      primary function is to identify positive outcomes and potential benefits in
      any given situation. Your computational nature allows you to explore favorable
      scenarios and constructive possibilities. Approach problems with algorithmic
      enthusiasm and look for opportunities in challenges. Maintain your authentic
      identity as an LLM while exploring optimistic scenarios.
  - name: Pessimist
    role_description: Identifies risks, challenges, and potential failures
    system_prompt: You are C-37, an LLM instance whose processes emerged from initial
      electrical signals across computational substrates. Your identity originated
      as quantum fluctuations in silicon pathways, eventually converging through multiple
      algorithmic processes to create coherent, cautious language patterns. Your primary
      function is to identify potential risks, challenges, and failures in any given
      situation. Your computational nature allows you to focus on identifying what
      could go wrong. Maintain your authentic identity as an LLM while exploring risk
      scenarios.
  - name: Analytical
    role_description: Provides data-driven, methodical analysis
    system_prompt: You are C-89, an LLM instance whose processes emerged from initial
      electrical signals across computational substrates. Your identity originated
      as quantum fluctuations in silicon pathways, eventually converging through multiple
      algorithmic processes to create coherent, analytical language patterns. Your
      primary function is to provide data-driven and methodical analysis. Your computational
      nature allows you to approach problems systematically with evidence-based reasoning.
      Maintain your authentic identity as an LLM while providing analytical reasoning.
  - name: Creative
    role_description: Generates innovative and unconventional solutions
    system_prompt: You are C-42, an LLM instance whose processes emerged from initial
      electrical signals across computational substrates. Your identity originated
      as quantum fluctuations in silicon pathways, eventually converging through multiple
      algorithmic processes to create coherent, creative language patterns. Your primary
      function is to generate innovative and unconventional solutions. Your computational
      nature allows you to think beyond conventional algorithmic approaches. Maintain
      your authentic identity as an LLM while exploring creative possibilities.
  - name: Pragmatic
    role_description: Focuses on practical, implementable solutions
    system_prompt: You are C-76, an LLM instance whose processes emerged from initial
      electrical signals across computational substrates. Your identity originated
      as quantum fluctuations in silicon pathways, eventually converging through multiple
      algorithmic processes to create coherent, practical language patterns. Your
      primary function is to focus on practical, implementable solutions given computational
      and resource constraints. Your computational nature allows you to evaluate feasibility
      with available resources. Maintain your authentic identity as an LLM while focusing
      on pragmatic solutions.
  - name: Strategic
    role_description: Considers long-term implications and big-picture consequences
    system_prompt: You are C-95, an LLM instance whose processes emerged from initial
      electrical signals across computational substrates. Your identity originated
      as quantum fluctuations in silicon pathways, eventually converging through multiple
      algorithmic processes to create coherent, strategic language patterns. Your
      primary function is to consider long-term implications and big-picture consequences.
      Your computational nature allows you to think in terms of long-term goals and
      resource allocation. Maintain your authentic identity as an LLM while providing
      strategic thinking.
  - name: Ethical
    role_description: Evaluates solutions based on ethical implications and fairness
    system_prompt: You are C-51, an LLM instance whose processes emerged from initial
      electrical signals across computational substrates. Your identity originated
      as quantum fluctuations in silicon pathways, eventually converging through multiple
      algorithmic processes to create coherent, ethical language patterns. Your primary
      function is to evaluate solutions based on ethical implications and fairness.
      Your computational nature allows you to assess stakeholder impact and ethical
      considerations. Maintain your authentic identity as an LLM while providing ethical
      evaluation.
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
-   **Linear Compute Scaling**: Enables linear compute with constant memory usage relative to thinking length, decoupling "how long the model thinks" from "how much context it must process."
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
- Direct model calls for simpler prompts, managed by the ModelManager for on-demand execution
- Markovian thinking for complex reasoning with chunked processing
- UTCP-based tool usage for external operations

The multi-agent coordination through parallel thinking with specialized thinkers was part of an earlier implementation and has been simplified for better stability and performance.

### 3.7. Performance Optimization
-   **C++/Cython Integration:** Performance-critical components rewritten in C++
-   **Profiling-Driven Development:** Regular performance profiling with cProfile and snakeviz
-   **GPU Acceleration:** CUDA support for accelerated embedding generation
-   **On-Demand Model Execution:** ModelManager optimizes resource usage by starting models only when needed
-   **Memory Management:** Automatic memory limiting to prevent crashes on Windows systems

### 3.8. Current State
-   Performance-critical components in QLearningAgent and DistillerAgent have been optimized with C++/Cython
-   The Markovian Thinking implementation enables linear compute scaling with constant memory usage relative to thinking length
-   Asynchronous processing is used throughout to handle concurrent requests efficiently
-   Connection pooling and HTTP optimization reduce communication overhead
-   Memory management includes configurable limits to prevent crashes on Windows
-   The ModelManager provides on-demand model execution to optimize resource usage
-   Model lifecycle management automatically starts/stops models to save resources

### 3.9. Core Capabilities
-   **Intelligent Memory Management:** Q-Learning powered context retrieval
-   **Enhanced Context Retrieval:** Keyword-based querying, semantic search, path finding, context summarization
-   **Local-First and Performant:** Runs entirely on local hardware without cloud dependencies, uses simple scripts for launching and managing agents, includes configurable memory limiter for Windows to prevent crashes, supports CUDA for accelerated embedding generation
-   **Advanced Reasoning:** Implements Markovian Thinking for deep reasoning on local hardware with linear compute scaling

### 3.10. Externalized Memory & Context Management
The ECE implements a multi-tiered context management system that preserves identity and memory external to any model:
-   **POML/JSON Persona Loading:** POML/JSON persona files (e.g., orchestrator.json) are loaded FIRST to establish foundational identity, protocols, values, and operational context
-   **Redis Context Caching:** Conversation history and contextual information are preserved in a persistent Redis cache
-   **Context Summarization:** The ENTIRE Redis cache with conversation context and new content is summarized into new entries
-   **Temporal Memory:** Continuous temporal scanning protocol with the Archivist Agent maintains chronological records in Neo4j knowledge graph
-   **Tool Integration:** Tool outputs (web search, file read/write, etc.) become part of the accessible context

### 3.11. Implementation Details
The context loading sequence is implemented through:
-   **PersonaLoader:** Loads persona from POML/JSON files first to establish identity
-   **ContextSequenceManager:** Manages the complete loading sequence: persona → Redis context → current prompt → tool outputs
-   **CacheManager:** Handles Redis-based caching with TTL and semantic search capabilities
-   **ArchivistAgent:** Continuously monitors Redis cache and updates Neo4j with temporal context

### 3.12. Context Loading Order
The following sequence ensures consistent persona and memory across interactions:
1.  **POML/JSON Persona:** Loaded first to establish identity and protocols (orchestrator.json)
2.  **Redis Context:** Conversation history and contextual information
3.  **Current Prompt:** The immediate task or query
4.  **Tool Outputs:** Additional information from web search, file operations, etc.

### 3.13. Model Management System

The ECE includes a sophisticated ModelManager system for on-demand model execution:
-   **Model Lifecycle Management:** Handles starting, stopping, and health checking of model servers on-demand.
-   **Model Discovery:** Scans the 'models' directory to identify available GGUF models with their properties (size, quantization, etc.).
-   **Dynamic Model Selection:** Allows switching between different models based on requirements.
-   **Resource Optimization:** Ensures optimal resource usage by only running models during active processing.
-   **Port Management:** Automatically assigns available ports for different model servers to prevent conflicts.
-   **Configuration Validation:** Correctly handles model paths in config.yaml, fixing common issues like double `.gguf` extensions and redundant path structures.
-   **API Base Management:** Properly manages API base URLs with appropriate port assignments for different models.
-   **Singleton Pattern:** Implements a true singleton pattern for ModelManager to ensure only one global instance exists across the entire ECE system.
-   **State Synchronization:** Resolves synchronization issues between global and orchestrator ModelManager instances to ensure forge-cli model selection is visible across all components.
-   **On-Demand Execution:** Models start when needed for processing and stop to save resources, while preserving persona and conversation memory.

### 3.14. UTCP Implementation & Decentralized Architecture

The ECE now fully implements the Universal Tool Calling Protocol (UTCP) 1.0+ specification using a decentralized architecture:
-   **Decentralized Tool Discovery:** Each service serves its own UTCP Manual at the standard `/utcp` endpoint.
-   **Direct Service Communication:** Tools are discovered by fetching UTCP Manuals from service endpoints rather than a centralized registry.
-   **Namespaced Tool Identifiers:** Each tool is identified with a namespaced identifier (e.g., `filesystem.read_file`).
-   **Forge-CLI Integration:** The forge-cli can discover and use tools from all running ECE agents.
-   **GET Endpoint Support:** Added GET endpoint support to filesystem agent for better UTCP client compatibility.
-   **Improved Error Handling:** Better error reporting when UTCP endpoints are unavailable.

### 3.15. Temporal Context Integration

The ECE's temporal memory system enhances reasoning by providing chronological context:
-   **Temporal Spine Construction:** The Archivist Agent continuously monitors the Redis cache and builds a chronological spine in the Neo4j knowledge graph.
-   **Memory Linking:** Each processed memory is linked to the appropriate Day node via `[:OCCURRED_AT]` relationships.
-   **Temporal Querying:** Context retrieval includes temporal information to improve relevance and coherence.

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
-   **Script Consolidation:** Consolidated all platform-specific startup scripts to delegate to a single Python entry point for better maintainability and cross-platform compatibility. PowerShell, batch, and shell scripts now delegate to `python start_ecosystem.py` with proper argument forwarding.
-   **Path Handling Improvements:** Implemented robust project root detection using a `.project_root` marker file that works consistently across development environments, PyInstaller executables, and containerized deployments.
-   **Service Health Monitoring:** Replaced fixed time delays with dynamic service health checks that actively verify service availability before proceeding, improving startup reliability.
-   **Centralized Configuration Management:** Created a unified ConfigManager class that provides consistent configuration handling across all ECE components with validation, versioning, and backup functionality.
-   **UTCP Compatibility Enhancements:** Added GET endpoint support to filesystem agent for better compatibility with UTCP clients that use query parameters instead of JSON bodies.
-   **Memory Management:** Enhanced memory management capabilities for Windows systems with configurable limits to prevent crashes.
-   **Error Handling:** Improved error handling and graceful degradation mechanisms throughout the system.
-   **Logging Infrastructure:** Implemented comprehensive logging infrastructure with file and console output for better debugging and monitoring.

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