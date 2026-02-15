# Relationship Narrative Discovery Guide

## Overview
The ECE Core now implements the Semantic Shift Architecture (Standard 084) that enables relationship narrative discovery across any domain. This transforms the system from a keyword indexer to a relationship historian.

## How It Works

### 1. Entity Co-occurrence Detection
When the system processes text, it looks for multiple entities appearing in the same semantic molecule:

```
Input: "Alice and Bob worked on the project together"
Processing:
  - Extract entities: ["Alice", "Bob"]
  - Detect relationship indicator: "and" (connecting two people)
  - Detect temporal reference: "together"
  - Apply semantic tags: #Relationship, #Narrative
```

### 2. Semantic Category Application
Instead of granular tags, the system applies high-level semantic categories:
- `#Relationship`: When 2+ person entities appear together
- `#Narrative`: When person + time reference appear together
- `#Technical`: When technical terms appear
- `#Location`: When geographic references appear

### 3. Cross-Domain Application
The same architecture works for any domain:

**Personal Domain:**
- Query: "Tell me about Alice and Bob"
- System finds: Molecules containing both "Alice" and "Bob"
- Returns: Relationship narratives between these entities

**Industrial Domain:**
- Query: "Tell me about CO2 and Sequestration"
- System finds: Molecules containing both "CO2" and "Sequestration"
- Returns: Industrial relationship narratives between these concepts

## Search Examples

### Relationship Queries
```
GET /v1/memory/search
{
  "query": "Alice and Bob relationship",
  "buckets": [],
  "max_chars": 20000,
  "provenance": "all"
}
```

### Narrative Queries
```
GET /v1/memory/search
{
  "query": "story about Alice and Bob",
  "buckets": [],
  "max_chars": 20000,
  "provenance": "all"
}
```

### Technical Queries
```
GET /v1/memory/search
{
  "query": "GLM-4.7-Flash performance",
  "buckets": [],
  "max_chars": 20000,
  "provenance": "all"
}
```

## Implementation Benefits

### 1. Improved Relevance
- Relationship queries return only relationship content
- Technical queries return only technical content
- Narrative queries return only story content

### 2. Reduced Noise
- No more "Jade" appearing in random code comments
- No more technical logs mixed with personal conversations
- Semantic filtering keeps domains separate

### 3. Universal Application
- Same architecture works for personal relationships
- Same architecture works for industrial data
- Same architecture works for technical documentation

## Architecture Components

### Semantic Molecule Processor
- Processes text chunks into semantic molecules
- Applies semantic categories based on entity interactions
- Extracts atomic entities from within semantic molecules

### Relationship Discovery Engine
- Detects when entities appear together
- Creates relationship tags for entity pairs
- Builds narrative arcs from temporal sequences

### Stateless Context Provider
- Each query gets fresh context from ECE search
- No session memory affecting responses
- Responses grounded in relevant knowledge graph data only

## Use Cases

### Personal Domain
- Finding relationship narratives between people
- Tracking personal story arcs over time
- Separating personal content from technical content

### Industrial Domain  
- Finding relationship patterns in industrial data
- Tracking technical concept connections
- Separating business data from personal notes

### Research Domain
- Finding connections between research topics
- Tracking academic narrative arcs
- Separating research content from personal content

## Best Practices

### For Relationship Queries
- Use phrases like "X and Y" to trigger relationship detection
- Include temporal references for narrative extraction
- Use semantic categories like `#Relationship` to filter results

### For Technical Queries
- Use technical terms to trigger `#Technical` categorization
- Include code context for better technical result filtering
- Use `#Technical` semantic category to isolate technical content

### For Cross-Domain Queries
- The system automatically detects domain context
- Entity co-occurrence works across all domains
- Same search interface for all content types