# Semantic Shift Architecture Guide

## Overview
The ECE Core now implements the Semantic Shift Architecture (Standard 084) that transforms the system from a keyword indexer to a semantic graph with relationship narrative discovery capabilities.

## Key Features

### 1. Semantic Categories
Instead of granular tags, the system now uses high-level semantic categories:
- `#Relationship` - Personal and professional connections
- `#Narrative` - Stories, timelines, and memory sequences  
- `#Technical` - Code, architecture, and system documentation
- `#Industry` - External market and domain-specific data
- `#Location` - Geographic and spatial references
- `#Emotional` - High sentiment variance content
- `#Temporal` - Time-based sequences and chronology
- `#Causal` - Cause-effect relationships

### 2. Entity Co-occurrence Detection
The system automatically detects when entities appear together in the same semantic molecule:
- When "Rob" and "Jade" appear together → `#Relationship` tag
- When person and time reference appear → `#Narrative` tag
- When technical terms appear → `#Technical` tag

### 3. Relationship Narrative Discovery
The system can extract relationship narratives by finding entity co-occurrence patterns across your data.

## How to Use

### Search for Relationships
To search for relationship content, include multiple entities in your query:
- "Rob and Jade" - Finds content where both entities appear together
- "Tell me about Rob and Dory" - Returns relationship narratives between these entities

### Use Semantic Categories in Queries
You can filter by semantic categories using hashtags:
- "Jade #Relationship" - Find relationship content about Jade
- "CO2 #Industry" - Find industrial content about CO2
- "Albuquerque #Location" - Find location-based content about Albuquerque

### Toggle Features
The UI includes two important toggles:
- **Save to Graph**: When enabled, saves conversations to the knowledge graph
- **Use Port 8080**: When enabled, routes API requests to port 8080 for Qwen Code CLI integration

## Architecture Benefits

### Improved Search Relevance
- Relationship queries return only relationship content
- Technical queries return only technical content
- Narrative queries return only story content

### Reduced Noise
- No more irrelevant matches mixing domains
- Semantic filtering keeps content types separate
- Context-first approach eliminates session memory baggage

### Universal Application
- Same architecture works for personal relationships
- Same architecture works for industrial data
- Same architecture works for technical documentation

## Implementation Details

### Semantic Molecule Processing
Text chunks are processed as semantic molecules with high-level tags instead of granular entity tagging.

### Stateless Contextual Chat
Each query gets fresh context from ECE search results instead of relying on chat session history.

### Dynamic Taxonomy
The system can adapt to different domains while maintaining semantic category consistency.

## Examples

### Personal Domain
```
Query: "What happened between Rob and Jade?"
Result: Finds all content where "Rob" and "Jade" appear together, highlighting their relationship narrative.
```

### Industrial Domain
```
Query: "How is CO2 related to sequestration?"
Result: Finds content where "CO2" and "sequestration" appear together, highlighting industrial relationships.
```

### Technical Domain
```
Query: "Explain the relationship between CozoDB and ECE?"
Result: Finds technical content where these concepts appear together, highlighting system architecture relationships.
```

## Standards Compliance
- Implements Standard 084: Semantic Shift Architecture
- Maintains backward compatibility with existing functionality
- Preserves the "Sovereign" nature of the context engine