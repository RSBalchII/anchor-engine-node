# External Context Engine (ECE) Implementation Plan v3.4

## Overview

This document outlines the implementation plan for the External Context Engine (ECE) v3.4, aligning with the updated specifications. The plan focuses on implementing the Universal Tool Calling Protocol (UTCP) integration, replacing bespoke wrapper APIs with standardized tool definitions that can be discovered and called through a central UTCP Tool Registry. This upgrade enables dynamic tool discovery and calling between ECE agents while maintaining all existing functionality including tool integration capabilities that enable the system to help write and modify its own code. The plan includes phases for UTCP infrastructure implementation, agent migration, and continued self-development capabilities.

## Implementation Phases

### Phase 1: Documentation Update and Task Definition (Completed)
- Update `spec.md` to reflect v3.4 architecture with UTCP integration
- Update `plan.md` (this document) with UTCP integration plan
- Update `task.md` with new tasks for UTCP implementation and continued self-development

### Phase 2: UTCP Infrastructure Implementation (Current)
- **Priority 1: UTCP Tool Registry Service**
  - Design and implement central UTCP Tool Registry for tool discovery
  - Implement API endpoints for tool registration and discovery
  - Create tool definition schema validation
  - Add health check and monitoring endpoints
- **Priority 2: UTCP Client Library**  
  - Design and implement standardized UTCP client interface
  - Implement tool discovery functionality
  - Implement tool calling functionality with parameter validation
  - Add error handling and retry mechanisms
- **Priority 3: Agent Tool Registration**
  - Update Orchestrator to register its tools with the UTCP Registry
  - Update Archivist to register its tools with the UTCP Registry
  - Update Distiller to register its tools with the UTCP Registry
  - Update QLearning to register its tools with the UTCP Registry
  - Update Injector to register its tools with the UTCP Registry

### Phase 3: Tool Agent Implementation (Planned)
- **Priority 1: FileSystemAgent**
  - Design and implement secure file system operations
  - Implement read, write, create, and delete capabilities with security boundaries
  - Integrate with context cache for file content storage
- **Priority 2: WebSearchAgent**  
  - Enhance existing web search capabilities with Tavily API
  - Implement rate limiting and safe search parameters
  - Add result storage in context cache
- **Priority 3: Orchestrator Enhancement**
  - Update decision tree with tool agent routing
  - Implement security boundaries for tool access
  - Test tool integration workflows

### Phase 4: Agent Migration to UTCP (Planned)
- **Priority 1: Replace Bespoke HTTP Clients**
  - Replace Orchestrator's ArchivistClient with UTCP tool calls
  - Replace Archivist's clients (DistillerClient, QLearningAgentClient, InjectorClient) with UTCP tool calls
- **Priority 2: Maintain Backward Compatibility**
  - Ensure seamless transition during migration
  - Test all agent communications via UTCP
  - Monitor performance during migration
- **Priority 3: Remove Deprecated Code**
  - Remove old HTTP client code after successful migration
  - Clean up deprecated functions and imports
  - Update configuration to use UTCP client

### Phase 5: CLI Quality of Life Improvements (Planned)
- **Priority 1: Enhanced User Experience**
  - Implement proper arrow key navigation for text editing
  - Create professional welcome screen inspired by Gemini/Qwen CLIs
  - Enable command history navigation with up/down arrows
  - Add input validation and error handling
- **Priority 2: Local-CLI Open Source Initiative**
  - Prepare CLI for independent open-source release
  - Create branding as "local-cli" to emphasize independence
  - Document open-source contribution process
  - Add customization options for users
- **Priority 3: Performance and Usability**
  - Optimize response times and interaction smoothness
  - Implement user-configurable appearance settings
  - Add advanced command history features
  - Create help and documentation within CLI

### Phase 6: Self-Development Flow Implementation (Planned)
- **Priority 1: Self-Analysis Flow**
  - Enable ECE to read and understand its own codebase
  - Store code files in context cache for analysis
  - Create pattern recognition for code structures
- **Priority 2: Self-Modification Flow**
  - Implement safe code modification capabilities
  - Add safeguards and validation for changes
  - Create version control integration
- **Priority 3: Self-Verification Flow**
  - Generate tests for code changes
  - Validate changes against specifications
  - Implement build/test automation

### Phase 7: Advanced Self-Development (Future)
- **Priority 1: Autonomous Improvement Loops**
  - Implement iterative self-improvement cycles
  - Create learning from usage patterns
  - Develop feature suggestion capabilities
- **Priority 2: Specification Evolution**
  - Allow ECE to propose specification updates
  - Implement feedback integration from usage
  - Self-align with strategic goals

### Phase 8: Llama.cpp Integration (Planned)
- **Priority 1: Llama.cpp Provider Implementation**
  - Develop a new provider for Llama.cpp in `llm_providers`.
  - Ensure it's compatible with the existing `LLMProvider` interface.
- **Priority 2: Configuration Update**
  - Add `llama_cpp` to the `config.yaml` with appropriate settings (e.g., `model_path`, `api_base`).
  - Update `llm_configuration.md` to reflect the new provider.
- **Priority 3: Docker Integration**
  - Add a new service to `docker-compose.yml` for the Llama.cpp server.
  - Ensure the ECE can connect to the Llama.cpp container.
- **Priority 4: Testing and Validation**
  - Create unit and integration tests for the Llama.cpp provider.
  - Validate that the ECE can generate responses using Llama.cpp.

## Detailed Task Breakdown

### Task T-001: Implement UTCP Tool Registry Service
- **Description**: Design and implement the central UTCP Tool Registry for standardized tool discovery and access across all ECE agents.
- **Priority**: High
- **Target Components**: UTCP Tool Registry
- **Status**: Planned

### Task T-002: Implement UTCP Client Library
- **Description**: Design and implement the standardized UTCP client interface for discovering and calling tools via the registry.
- **Priority**: High
- **Target Components**: UTCP Client
- **Status**: Planned

### Task T-003: Agent Tool Registration Implementation
- **Description**: Update each ECE agent to register its available tools with the UTCP Registry using standardized tool definitions.
- **Priority**: High
- **Target Agents**: OrchestratorAgent, ArchivistAgent, DistillerAgent, QLearningAgent, InjectorAgent
- **Status**: Planned

### Task T-004: Replace Bespoke HTTP Clients with UTCP Calls
- **Description**: Replace all custom HTTP client implementations with standardized UTCP tool calls for inter-agent communication.
- **Priority**: High
- **Target Agents**: OrchestratorAgent, ArchivistAgent
- **Status**: Planned

### Task T-005: Implement FileSystemAgent
- **Description**: Design and implement the `FileSystemAgent` for secure file operations, enabling the ECE to read and write its own codebase.
- **Priority**: High
- **Target Agents**: FileSystemAgent, ContextCache
- **Status**: Planned

### Task T-006: Implement WebSearchAgent Enhancement
- **Description**: Enhance the existing `WebSearchAgent` to utilize the Tavily API with proper rate limiting and security boundaries.
- **Priority**: High
- **Target Agents**: WebSearchAgent
- **Status**: Planned

### Task T-007: Update Orchestrator Decision Tree
- **Description**: Modify the Orchestrator's decision tree to route file and web requests to the appropriate tool agents.
- **Priority**: High
- **Target Agents**: OrchestratorAgent
- **Status**: Planned

### Task T-008: Implement Security Boundaries
- **Description**: Define and implement security boundaries for tool agent access to prevent unauthorized operations.
- **Priority**: High
- **Target Agents**: All agents
- **Status**: Planned

### Task T-009: Implement Self-Analysis Capability
- **Description**: Enable the ECE to read and analyze its own codebase using the new tool agents.
- **Priority**: Medium
- **Target Agents**: FileSystemAgent, OrchestratorAgent
- **Status**: Planned

### Task T-010: Implement Self-Modification Capability
- **Description**: Allow the ECE to modify its own code with proper validation and safeguards.
- **Priority**: Medium
- **Target Agents**: FileSystemAgent, OrchestratorAgent
- **Status**: Planned

### Task T-011: Implement Self-Verification Flow
- **Description**: Create automated testing and validation for self-modifications.
- **Priority**: Medium
- **Target Agents**: All agents
- **Status**: Planned

## Implementation Timeline

- **Week 1-2**: Complete Phase 2 tasks (UTCP Infrastructure Implementation)
- **Week 3**: Complete Phase 3 tasks (Tool Agent Implementation)
- **Week 4**: Complete Phase 4 tasks (Agent Migration to UTCP)
- **Week 5**: Complete Phase 5 tasks (CLI Interface Development)
- **Week 6**: Complete Phase 6 tasks (Self-Development Flow Implementation)
- **Week 7**: Testing, integration, and documentation finalization
- **Week 8+**: Begin Phase 7 (Advanced Self-Development)

## Success Criteria

- UTCP Tool Registry is operational and serving tool definitions
- UTCP Client library is implemented and functional across all agents
- All agents successfully register their tools with the UTCP Registry
- Bespoke HTTP clients are replaced with UTCP tool calls
- Tool agents are correctly implemented and securely integrated
- ECE-CLI provides rich command-line interface with persistent context
- CLI incorporates POML persona and emotional lexicon display
- Local Ollama integration provides low-latency, private responses
- ECE can safely read and analyze its own codebase
- Self-modification flows include proper validation and safeguards
- System maintains stability while enabling autonomous development
- All new tasks from the updated specification are completed
- Updated documentation accurately reflects the new UTCP integration and self-development capabilities
- Performance and security standards are maintained during UTCP integration and self-modification

## Security Considerations

- All tool access must be logged and auditable
- File system access boundaries must prevent unauthorized operations
- Code modification safeguards must prevent breaking changes
- Rate limiting must prevent abuse of web search capabilities
- Access to system files must be restricted to prevent privilege escalation
- CLI configuration must securely store API keys and model settings

## Self-Development Guidelines

- All code modifications must be reversible
- Changes must be validated against specifications before application
- Automated testing must pass before any self-modification is applied
- Human oversight should be available for critical changes
- Backup and recovery mechanisms must be in place

## Local Ollama Integration

- Direct communication with local Ollama instance for enhanced privacy
- Optimized resource utilization leveraging local GPU/CPU
- Reduced latency through local processing
- Support for multiple local models simultaneously
- Configuration management for model selection and parameters
- Model download and management capabilities within the CLI interface