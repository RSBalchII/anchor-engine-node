# Standard 084: Stateless Contextual Chat Protocol (Intelligent Context Provision)

**Status:** Active | **Domain:** 00-CORE | **Category:** Architecture & Context Management

## 1. Core Philosophy: "Context-First, Stateless Interaction"

The ECE implements a **Stateless Contextual Chat Protocol** that eliminates traditional chat session memory while maximizing contextual relevance through dynamic ECE data retrieval. This approach ensures each interaction is grounded in the most relevant knowledge graph data without accumulating conversational baggage.

### 1.1 The Problem: Conversational Drift
- Traditional chat systems accumulate context over time, leading to drift from the original topic
- Session memory can become irrelevant or misleading for new queries
- Context pollution occurs when unrelated conversation fragments influence responses

### 1.2 The Solution: Context Reset Protocol
- Each user query triggers a fresh ECE search for relevant context
- Model operates in "stateless" mode with only current context + user prompt
- Previous conversation history is not retained in model context

## 2. Protocol Architecture

### 2.1 Three-Stage Flow: Context -> Prompt -> Model
```
User Query -> ECE Search API -> Context Assembly -> Model Inference
```

1. **Context Retrieval**: ECE search API retrieves relevant atoms/molecules based on query
2. **Context Assembly**: Retrieved data is formatted as system prompt context
3. **Model Inference**: Model processes context + user query without session history

### 2.2 API Contract
```typescript
interface ChatRequest {
  messages: Array<{role: string, content: string}>;
  model?: string;
  save_to_graph?: boolean;  // Optional: Save conversation to knowledge graph
  // ... other parameters
}

// Context is injected as system message:
[
  { role: 'system', content: `Context:\n${searchResults.context}\n\nPrevious conversation and user context has been omitted for performance. Use only the provided context above to inform your response.` },
  { role: 'user', content: userQuery }
]
```

## 3. Implementation Details

### 3.1 Context Assembly Process
- **Query Analysis**: Parse user query for semantic meaning and keywords
- **ECE Search**: Execute `executeSearch()` with query, buckets=[], maxChars=20000, provenance='all'
- **Context Formatting**: Structure search results into coherent context block
- **System Prompt Injection**: Inject context as system message before user query

### 3.2 Stateless Model Operation
- Model receives only current context + current user query
- No accumulated conversation history in context window
- Each response is grounded solely in retrieved ECE data and current prompt
- Prevents context drift and maintains topical relevance

## 4. Toggle Features

### 4.1 Save-to-Graph Toggle
- **Purpose**: Optionally persist conversation to knowledge graph
- **Default**: `false` to reduce garbage ingestion
- **Mechanism**: When enabled, both user messages and AI responses are saved to `['inbox', 'personal']` buckets with `['#chat', '#conversation']` tags

### 4.2 Port 8080 Toggle
- **Purpose**: Route API requests to separate server instance for Qwen Code CLI integration
- **Mechanism**: When enabled, API calls use `http://localhost:8080` prefix instead of default
- **Benefits**: Isolated environment for CLI tools while maintaining main application functionality

## 5. Benefits

### 5.1 Performance Advantages
- **Reduced Context Window**: No accumulated conversation history reduces token usage
- **Relevant Context**: Fresh ECE search ensures most relevant information is provided
- **Predictable Behavior**: Consistent response quality regardless of conversation length

### 5.2 Cognitive Advantages
- **Topical Focus**: Responses remain focused on current query rather than conversation history
- **Knowledge Grounding**: Each response is grounded in actual ECE data rather than memorized fragments
- **Fresh Perspective**: Model approaches each query with clean context slate

## 6. Trade-offs

### 6.1 Potential Drawbacks
- **Loss of Conversation Flow**: No ability to reference previous exchanges in current response
- **Redundant Retrieval**: Context may be re-retrieved for related follow-up questions
- **Context Window Pressure**: Large context blocks may compete with response generation tokens

### 6.2 Mitigation Strategies
- **Context Relevance**: Sophisticated ECE search ensures retrieved context is highly relevant
- **Query Understanding**: Natural language processing identifies when follow-up context is needed
- **Efficient Retrieval**: Optimized search algorithms minimize retrieval latency

## 7. Quality Assurance

### 7.1 Testing Requirements
- Verify context injection works correctly for various query types
- Test save-to-graph functionality preserves conversation integrity
- Validate port 8080 routing operates as expected
- Confirm stateless operation prevents context drift

### 7.2 Monitoring Points
- Context retrieval latency
- Context relevance scoring
- Model response quality metrics
- Knowledge graph ingestion patterns when save-to-graph is enabled

---
**Created:** 2026-01-30  
**Last Updated:** 2026-01-30  
**Authority:** System Core