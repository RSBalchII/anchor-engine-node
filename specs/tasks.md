# Anchor - Implementation Tasks

**Format**: [ID] [Priority] [Status] [Task] - [Context]

**Status Codes**:
- ✅ Complete
- 🔄 In Progress
- 📅 Planned
- ⏸️ Deferred
- ❌ Blocked

---

## High Priority - Production Readiness

### Security & Safety

**T-100** ✅ **HIGH** - Add security warnings to README
- COMPLETED: Security warnings added to README.md
- COMPLETED: Security warnings added to .env.example
- COMPLETED: Tests verify warnings exist
- **Status**: ✅ Complete

**T-101** ✅ **HIGH** - Implement tool sandboxing
- COMPLETED: tool_safety.py module created
- COMPLETED: SAFE_TOOLS and DANGEROUS_TOOLS categories
- COMPLETED: User confirmation for dangerous tools
- COMPLETED: Input sanitization for shell commands
- COMPLETED: Tests in test_tool_safety.py
- **Status**: ✅ Complete (integration into main.py pending)

**T-102** 📅 **MEDIUM** - Add rate limiting to MCP endpoints
- Implement rate limiting on MCP server endpoints
- Add configurable limits in config.yaml
- Log rate limit violations
- **Estimate**: 2 hours
- **Dependencies**: None

**T-103** 📅 **MEDIUM** - Add session validation/authentication
- Implement session token validation
- Add authentication to ECE_Core connection
- Secure MCP server endpoints
- **Estimate**: 3 hours
- **Dependencies**: None

### Testing Infrastructure

**T-110** ✅ **HIGH** - Create automated test suite
- COMPLETED: tests/ directory structure created
- COMPLETED: pytest configuration in pyproject.toml
- COMPLETED: Health check tests (test_health.py)
- COMPLETED: Integration tests (test_integration.py)  
- COMPLETED: Tool safety tests (test_tool_safety.py)
- **Status**: ✅ Complete (19 tests passing)

**T-111** ✅ **MEDIUM** - Add smoke tests
- COMPLETED: Smoke tests for services starting
- COMPLETED: Memory retrieval smoke tests
- COMPLETED: Tool call smoke tests
- COMPLETED: Graceful degradation tests
- **Status**: ✅ Complete (included in test_health.py)

**T-112** ✅ **MEDIUM** - Add integration tests
- COMPLETED: ECE_Core connection tests
- COMPLETED: MCP server communication tests (structure)
- COMPLETED: End-to-end message flow tests
- COMPLETED: Session persistence tests
- **Status**: ✅ Complete (skipped when ECE_Core not running)

### Dependency Management

**T-120** ✅ **HIGH** - Clean up unused dependencies
- COMPLETED: Audited requirements.txt for unused packages
- COMPLETED: Removed UTCP dependencies (not used - only in src.old/)
- COMPLETED: Removed textual and rich (using simple CLI, not TUI)
- COMPLETED: Documented why each dependency is needed
- COMPLETED: Added version constraints
- **Status**: ✅ Complete

**T-121** ✅ **MEDIUM** - Version pin all dependencies
- COMPLETED: Added version constraints to all packages
- COMPLETED: Tested compatibility
- COMPLETED: Documented minimum versions
- **Status**: ✅ Complete

### Documentation

**T-130** ✅ **HIGH** - Create TROUBLESHOOTING.md
- COMPLETED: Consolidated scattered troubleshooting info
- COMPLETED: "Cannot connect" error solutions
- COMPLETED: "Tool calls not working" → model size issue documented
- COMPLETED: Redis/Neo4j connection failure solutions
- COMPLETED: Common issues and fixes (9KB guide)
- **Status**: ✅ Complete

**T-131** ✅ **MEDIUM** - Add resource requirements to README
- COMPLETED: RAM requirements documented (4B model = ~3GB, 14B = ~8GB)
- COMPLETED: Disk space requirements documented  
- COMPLETED: Expected startup time documented
- COMPLETED: Performance expectations added
- **Status**: ✅ Complete

**T-132** 📅 **LOW** - Version releases with git tags
- Tag v0.1.0 "Alpha release: Core memory + MCP tools"
- Create release process documentation
- Add version bumping guidelines
- **Estimate**: 30 minutes
- **Dependencies**: None

---

## Medium Priority - UX Improvements

### Tool Reliability

**T-200** 📅 **HIGH** - Implement tool call confidence scoring
- Add heuristics to rate tool call validity (0-1 score)
- Check for TOOL_CALL: prefix
- Validate regex patterns for tool syntax
- Ask for confirmation if confidence < 0.7
- **Estimate**: 4 hours
- **Dependencies**: None

**T-201** 📅 **HIGH** - Add tool call repair layer
- Detect malformed tool calls
- Attempt automatic correction
- Provide helpful error messages
- Log repair attempts for analysis
- **Estimate**: 5 hours
- **Dependencies**: T-200

**T-202** 📅 **MEDIUM** - Add few-shot examples for tool calling
- Add tool call examples to system prompts
- Customize examples based on model size
- Test with small models (<14B)
- Measure improvement in reliability
- **Estimate**: 3 hours
- **Dependencies**: T-200

**T-203** 📅 **MEDIUM** - Implement guided mode for ambiguous tools
- Prompt users when tool execution is ambiguous
- Show tool parameters for confirmation
- Allow editing before execution
- **Estimate**: 4 hours
- **Dependencies**: T-200

### Progressive Tool Enhancement

**T-210** 📅 **MEDIUM** - Implement tool safety tiers
- Define SAFE_TOOLS (filesystem_read, web_search)
- Define DANGEROUS_TOOLS (shell_execute)
- Auto-execute safe tools
- Require confirmation for dangerous tools
- **Estimate**: 2 hours
- **Dependencies**: T-101

**T-211** 📅 **LOW** - Add tool execution telemetry
- Track tool usage frequency
- Measure tool execution success rate
- Log tool execution time
- Generate usage reports
- **Estimate**: 3 hours
- **Dependencies**: None

### Quick Wins

**T-220** ✅ **HIGH** - Create start-everything.bat script
- COMPLETED: Already exists in project root
- Starts ECE_Core, then Anchor
- Proper timing delays
- **Status**: ✅ Working

**T-221** 📅 **MEDIUM** - Add one-command setup script
- Create setup.bat for Windows
- Install dependencies
- Configure .env
- Verify services
- **Estimate**: 2 hours
- **Dependencies**: None

**T-222** 📅 **LOW** - Add resource monitoring
- Display RAM usage
- Display disk space usage
- Show active connections
- **Estimate**: 2 hours
- **Dependencies**: None

---

## Low Priority - Advanced Features

### Memory Visualization

**T-300** ⏸️ **LOW** - Add memory visualization web UI
- Create web UI showing memory connections
- Visualize Neo4j graph
- Interactive exploration
- **Estimate**: 12 hours
- **Dependencies**: Neo4j integration in ECE_Core
- **Status**: Deferred to v0.3.0

**T-301** ⏸️ **LOW** - Add GraphViz export
- Export Neo4j graph to DOT format
- Generate SVG/PNG visualizations
- Add to documentation
- **Estimate**: 4 hours
- **Dependencies**: T-300
- **Status**: Deferred to v0.3.0

**T-302** ⏸️ **LOW** - Add timeline view
- Show conversation history timeline
- Filter by date/topic
- Export timeline
- **Estimate**: 6 hours
- **Dependencies**: None
- **Status**: Deferred to v0.3.0

### Memory Retrieval Optimization

**T-310** 📅 **MEDIUM** - Add memory retrieval telemetry
- Track number of memories retrieved per query
- Measure cache hit rate (Redis vs Neo4j)
- Identify most effective retrieval patterns
- Generate optimization recommendations
- **Estimate**: 4 hours
- **Dependencies**: None

**T-311** 📅 **LOW** - Optimize retrieval performance
- Implement caching strategy
- Add retrieval query optimization
- Benchmark before/after
- **Estimate**: 6 hours
- **Dependencies**: T-310

### Architecture Improvements

**T-320** 📅 **MEDIUM** - Decouple MCP tools into standalone service
- Extract MCP server from Anchor
- Make MCP tools available independently
- Allow other clients to use ECE_Core
- Update architecture docs
- **Estimate**: 8 hours
- **Dependencies**: None

**T-321** 📅 **LOW** - Add async event loop cleanup
- Review asyncio.run() usage
- Use asyncio.run_in_executor() for blocking calls
- Full async from top to bottom
- Fix ASYNC_LOOP_FIX.md issues permanently
- **Estimate**: 6 hours
- **Dependencies**: None

---

## Documentation Improvements

### README Enhancements

**T-400** 📅 **HIGH** - Update README with security warnings
- Add security section
- Warn about shell_execute
- Document network exposure risks
- Link to TROUBLESHOOTING.md
- **Estimate**: 1 hour
- **Dependencies**: T-100, T-130

**T-401** 📅 **MEDIUM** - Add architecture diagram
- Create visual architecture diagram
- Show component interactions
- Document data flow
- **Estimate**: 2 hours
- **Dependencies**: None

**T-402** 📅 **MEDIUM** - Add API documentation
- Document ECE_Core API endpoints
- Document MCP server endpoints
- Add example requests/responses
- **Estimate**: 3 hours
- **Dependencies**: None

### Code Quality

**T-410** 📅 **LOW** - Add type hints throughout codebase
- Add mypy configuration
- Type hint all functions
- Fix type errors
- **Estimate**: 4 hours
- **Dependencies**: None

**T-411** 📅 **LOW** - Add code quality metrics
- Setup code coverage tracking
- Add complexity metrics
- Document code quality standards
- **Estimate**: 2 hours
- **Dependencies**: T-110

---

## Current Sprint (Week of 2025-11-14)

### Completed Tasks ✅

**T-100** ✅ - Security warnings (README + .env.example)
**T-101** ✅ - Tool sandboxing implementation (tool_safety.py)
**T-110** ✅ - Test suite creation (19 tests passing)
**T-111** ✅ - Smoke tests
**T-112** ✅ - Integration tests
**T-120** ✅ - Dependency cleanup
**T-121** ✅ - Version pinning
**T-130** ✅ - TROUBLESHOOTING.md
**T-131** ✅ - Resource requirements

### Remaining Tasks 📅

**T-102** 📅 - Rate limiting (MCP endpoints)
**T-103** 📅 - Session validation/authentication
**T-132** 📅 - Git version tagging
**T-200** 📅 - Tool call confidence scoring
**T-201** 📅 - Tool call repair layer

### Next Sprint (2025-11-22 to 2025-11-29)

**T-102** - Rate limiting implementation
**T-103** - Authentication system
**T-200** - Tool reliability improvements

---

## Success Metrics

### Technical Metrics
- **Startup Time**: <1s (Current: ~0.5s) ✅
- **Response Time**: <5s (Target)
- **Memory Usage**: <100MB (Current: ~40MB) ✅
- **Tool Discovery**: <500ms (Target)
- **Test Coverage**: >80% (Target)
- **Code Complexity**: <10 per function (Target)

### UX Metrics
- **Natural Language**: 100% ✅
- **Memory Retrieval**: Transparent (In Progress)
- **Tool Auto-Execute**: >80% accuracy (Target)
- **Session Persistence**: 100% ✅

### Security Metrics
- **Input Sanitization**: 100% for shell tools (Target)
- **Rate Limiting**: Enabled on all endpoints (Target)
- **Authentication**: Required for all services (Target)
- **Security Warnings**: Prominent in docs (Target)

---

## Task Dependencies Graph

```
T-100 (Security Warnings)
  ↓
T-101 (Tool Sandboxing) → T-210 (Tool Safety Tiers)
  ↓
T-200 (Confidence Scoring)
  ↓
T-201 (Tool Repair) ← T-202 (Few-shot Examples)
  ↓
T-203 (Guided Mode)

T-110 (Test Suite)
  ↓
T-111 (Smoke Tests) → T-112 (Integration Tests)
  ↓
T-411 (Code Quality Metrics)

T-120 (Dependency Audit)
  ↓
T-121 (Version Pinning)

T-130 (TROUBLESHOOTING.md)
  ↓
T-400 (README Security Section)
```

---

## Technical Debt Tracker

### High Priority Debt
1. **No automated tests** - T-110, T-111, T-112
2. **Security gaps** - T-101, T-102, T-103
3. **Unused dependencies** - T-120
4. **Async event loop issues** - T-321

### Medium Priority Debt
1. **No type hints** - T-410
2. **Scattered troubleshooting docs** - T-130
3. **MCP coupling** - T-320

### Low Priority Debt
1. **No memory visualization** - T-300, T-301, T-302
2. **No performance metrics** - T-310, T-311

---

## Completed Tasks (Archive)

### Week of 2025-11-12
- ✅ Documentation consolidation
- ✅ UTCP integration verification
- ✅ MCP server embedding
- ✅ Slash command system
- ✅ Configuration system (config.yaml)

### Week of 2025-11-10
- ✅ Project vision and architecture
- ✅ Specs creation (spec.md, plan.md)
- ✅ Initial CHANGELOG.md
- ✅ Rename to Anchor

---

**Next Review Date**: 2025-11-21
**Current Version**: v0.1.0-alpha
**Target Next Version**: v0.2.0-beta (with security + testing)
