# Orchestrator Agent Specification

## 1. Overview

The Orchestrator is the **Tier 1** central cognitive unit of the External Context Engine (ECE). It acts as the "brain" of the system, receiving context-enriched prompts, managing the short-term memory cache, delegating complex reasoning tasks, and synthesizing the final output for the user. It is the sole conductor of the ECE's active thought processes.

## 2. User Story

As the central cognitive unit of the ECE, I want to manage the flow of information, delegate tasks to specialized agents, and synthesize a coherent response so that the system can function as a seamless, symbiotic partner to the user.

## 3. Functional Requirements

### 3.1 Prompt & Cache Management
- The agent **must** receive context-enriched prompts from the `PromptInjector` agent.
- The agent **must** perform a lookup in the `Redis Context Cache` to find relevant information before proceeding with more complex operations.
- The agent **must** have full read, write, and delete privileges over the `Redis Context Cache` to manage the system's working memory.

### 3.2 Task Delegation & Reasoning
- The agent **must** analyze the incoming prompt to determine if specialized, deep reasoning is required.
- If reasoning is needed, the agent **must** formulate a precise sub-problem and delegate it to the appropriate **Tier 2 `Thinker`** agent.
- The agent **must** be able to manage multiple `Thinker` agents with different specializations (e.g., `MathThinker`, `CodeThinker`).

### 3.3 Response Synthesis
- The agent **must** synthesize information from multiple sources—the incoming prompt, the context cache, and the output from one or more `Thinker` agents—into a single, coherent final response.
- The agent **must** manage an internal "thought loop" capability, allowing it to chain prompts to itself or to `Thinker` agents to solve multi-step problems.

## 4. Non-Functional Requirements

### 4.1 Performance
- The agent's decision-making logic for task delegation should have minimal latency.
- The agent should handle responses from `Thinker` agents asynchronously to avoid blocking.

### 4.2 Reliability
- The agent **must** handle timeouts or errors from `Thinker` agents gracefully.
- The agent should have fallback strategies if a primary `Thinker` is unavailable.

### 4.3 Scalability
- The architecture must allow for the dynamic addition or removal of new `Thinker` agents without requiring a full system restart.

## 5. Integration Points

- **Upstream (Input):** `PromptInjector` (Tier 4) - Receives context-enriched prompts.
- **Downstream (Output):**
    - `Thinker` Agents (Tier 2) - Sends reasoning tasks.
    - User Interface - Sends the final, synthesized response.
- **Internal:** `Redis Context Cache` - Directly manages and utilizes this component.

## 6. Acceptance Criteria

- **Given** a simple query with context available in the cache, **when** the Orchestrator receives the prompt, **then** it should generate a response directly without calling a `Thinker`.
- **Given** a prompt requiring a specific, complex task (e.g., solving an equation), **when** the Orchestrator processes it, **then** it must delegate the task to the correct `Thinker` agent and incorporate the result into its final answer.
- **Given** a multi-step problem, **when** the Orchestrator processes it, **then** it should execute an internal thought loop, potentially calling multiple `Thinker` agents in sequence, before delivering the final answer.
- **Given** a `Thinker` agent that fails to respond, **when** the Orchestrator queries it, **then** it should return a graceful error message to the user without crashing.