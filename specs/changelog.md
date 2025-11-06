# ECE Changelog

## [Unreleased] - 2025-11-05

### Added
- Enhanced startup ordering to ensure Distiller agent starts before dependent agents
- Improved port availability verification with timeout handling
- Dependency-aware initialization sequence to prevent connection failures
- Timeout configuration for agent initialization with longer grace periods

### Changed
- Prioritized Distiller agent startup to prevent cascade failures
- Migrated startup scripts to use simple print functions instead of logger systems
- Updated startup delays to allow sufficient time for agent initialization
- Modified agent connection logic to verify service availability before communication
- Increased timeout values for agent startup and health checks

### Fixed
- Resolved persistent Distiller agent failures causing "All connection attempts failed" errors
- Fixed cascading failure pattern where Archivist and other agents failed due to Distiller unavailability
- Addressed missing spaCy model dependency (en_core_web_sm) required by Distiller agent
- Corrected startup timing issues preventing proper agent communication
- Resolved communication timeout issues between agents during initialization
- Fixed UTCP dependency issues affecting agent discovery and communication

### Removed
- Complex logging configurations that were interfering with startup sequence
- Unnecessary intermediate verification steps that delayed agent startup

### Known Issues
- Distiller agent may still fail to start due to missing 'spacy' dependency that needs to be installed separately
- UTCP dependencies may be missing causing "No module named 'langchain.globals'" errors
- Filesystem agent may experience port conflicts (WinError 10013) and 422 errors

## [v4.3.0] - 2025-10-31

### Added
- UTCP Multi-Protocol Support with fallback mechanisms
- Markovian Thinking Architecture for enhanced reasoning
- Multi-Agent Coordination with Theory of Mind (ToM) integration
- Enhanced Context Loading with POML/JSON persona support
- Real-time Logging with direct console output
- On-Demand Model Execution with ModelManager
- UTCP Integration with decentralized manual-based discovery
- Model Context Protocol (MCP) support
- Server-Sent Events (SSE) communication protocol

### Changed
- Updated all agents to use Unified Tool Calling Protocol (UTCP) for tool discovery
- Refactored OrchestratorAgent to EnhancedOrchestratorAgent with context management
- Migrated from Tavily API to local DuckDuckGo web search with no external dependencies
- Implemented decentralized UTCP approach connecting directly to individual service endpoints
- Upgraded to Q4_K_M quantized models for better performance and reduced VRAM usage
- Enhanced error handling and logging for better troubleshooting
- Improved model switching and management via ModelManager singleton
- Optimized startup times with reduced health check delays
- Centralized configuration management with environment variable support
- Refactored GitAgent to use local operations without external APIs

### Fixed
- Resolved POML verbose output issue causing model confusion
- Fixed 422 "Unprocessable Content" errors with UTCP clients
- Fixed double `.gguf` extension issues in model paths
- Fixed model switching inconsistencies between forge-cli and orchestrator
- Fixed GitAgent authentication and operation issues in Windows environment
- Fixed filesystem agent port conflicts and startup timeouts
- Corrected memory limit configuration for Windows systems
- Fixed UTCP endpoint registration and discovery issues
- Resolved configuration synchronization between different components
- Fixed model path configuration redundancies

## [v4.3.0] - 2025-10-31

### Added
- UTCP Multi-Protocol Support with fallback mechanisms
- Markovian Thinking Architecture for enhanced reasoning
- Multi-Agent Coordination with Theory of Mind (ToM) integration
- Enhanced Context Loading with POML/JSON persona support
- Real-time Logging with direct console output
- On-Demand Model Execution with ModelManager
- UTCP Integration with decentralized manual-based discovery
- Model Context Protocol (MCP) support
- Server-Sent Events (SSE) communication protocol

### Changed
- Updated all agents to use Unified Tool Calling Protocol (UTCP) for tool discovery
- Refactored OrchestratorAgent to EnhancedOrchestratorAgent with context management
- Migrated from Tavily API to local DuckDuckGo web search with no external dependencies
- Implemented decentralized UTCP approach connecting directly to individual service endpoints
- Upgraded to Q4_K_M quantized models for better performance and reduced VRAM usage
- Enhanced error handling and logging for better troubleshooting
- Improved model switching and management via ModelManager singleton
- Optimized startup times with reduced health check delays
- Centralized configuration management with environment variable support
- Refactored GitAgent to use local operations without external APIs

### Fixed
- Resolved POML verbose output issue causing model confusion
- Fixed 422 "Unprocessable Content" errors with UTCP clients
- Fixed double `.gguf` extension issues in model paths
- Fixed model switching inconsistencies between forge-cli and orchestrator
- Fixed GitAgent authentication and operation issues in Windows environment
- Fixed filesystem agent port conflicts and startup timeouts
- Corrected memory limit configuration for Windows systems
- Fixed UTCP endpoint registration and discovery issues
- Resolved configuration synchronization between different components
- Fixed model path configuration redundancies

## [v4.2.0] - 2025-10-28

### Added
- ModelManager class for on-demand model execution
- GitAgent implementation for local Git repository management
- LocalWebScraper class for website content scraping without external API
- DuckDuckGoSearchEngine class for privacy-first web search
- Enhanced context loading sequence with persona-first approach
- Token-aware prompt management to prevent overflow issues
- Performance optimizations using C++/Cython for critical bottlenecks
- Parallel startup optimization for faster system initialization
- ConfigManager class for centralized configuration handling
- ProjectRootDetector for reliable path resolution across environments

### Changed
- Switched from external API-based web search to local implementation
- Implemented singleton pattern for ModelManager to ensure global instance
- Enhanced error handling and reporting across all agents
- Improved session management with UUID generation
- Updated configuration to support both environment variables and config files
- Optimized communication protocols between agents with reduced delays
- Refactored logging to use standard Python logging with file and console output
- Improved startup and shutdown procedures with proper resource cleanup
- Enhanced configuration validation and error recovery mechanisms

### Fixed
- Memory management issues on Windows systems with configurable limits
- Context overflow issues with intelligent prompt truncation
- Process management and resource allocation problems
- Configuration loading and environment variable precedence issues
- Agent communication and health check timeout problems
- Dependency management and installation procedure issues
- Path resolution issues in different execution environments
- Service availability and connection establishment problems
- Redis and Neo4j authentication and connection issues
- Docker container management and service orchestration problems

## [v4.1.0] - 2025-10-25

### Added
- QLearningAgent with reinforcement learning for path finding
- DistillerAgent for extracting structured information from raw text
- ArchivistAgent for knowledge graph operations and temporal scanning
- InjectorAgent for optimizing knowledge graph through reinforcement learning
- UTCP (Universal Tool Calling Protocol) implementation
- Multi-tiered context management with Redis and Neo4j
- Semantic search capabilities using Sentence Transformers
- Memory cortex with specialized agents (Archivist, QLearning, Distiller, Injector)
- Configurable memory limiter for Windows systems
- GPU acceleration support for embedding generation
- Session management with conversation history
- Context summarization within LLM limits

### Changed
- Upgraded architecture from single-agent to multi-tier agent system
- Implemented knowledge graph with Neo4j for persistent storage
- Added Redis-based caching for improved performance
- Enhanced security with proper authentication for database services
- Improved error handling and reporting across agents
- Implemented proper session management and conversation history
- Optimized context management and retrieval mechanisms
- Enhanced memory management with temporal scanning capabilities
- Improved reliability with better service health checks
- Added comprehensive logging for debugging and monitoring

### Fixed
- Stability issues with context retrieval and management
- Memory leaks and resource management problems
- Communication issues between agents
- Authentication problems with Neo4j database
- Serialization issues with large context windows
- Performance bottlenecks in context processing
- Thread safety issues in multi-agent environment

## [v4.0.0] - 2025-10-20

### Added
- External Context Engine (ECE) multi-agent architecture
- OrchestratorAgent as central coordinator
- Tool agents (WebSearchAgent, FileSystemAgent)
- Local-first implementation without cloud dependencies
- FastAPI-based agent APIs
- Configuration system with environment variable support
- Script-based startup for local development
- Docker container support for Neo4j and Redis services

### Changed
- Initial implementation of the External Context Engine concept
- Multi-agent system architecture with clear tier separation
- Local execution model without cloud dependencies
- Complete cognitive architecture with memory management
- Integration with external services (Neo4j, Redis, LLM providers)
- Implementation of persistent memory and context management
- Development of agent communication protocols

### Fixed
- Initial architectural implementation
- Agent coordination mechanisms
- Service communication infrastructure
- Configuration and setup procedures