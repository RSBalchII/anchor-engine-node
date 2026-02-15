# Standard 087: Relationship Narrative Discovery (Entity Co-occurrence Detection)

**Status:** Active | **Domain:** Semantic Processing | **Category:** Relationship Mining

## Core Problem
The system needs to identify relationship patterns across domains by detecting when entities appear together in semantic molecules, enabling relationship narrative discovery across personal, industrial, and technical domains.

## The Challenge
Traditional entity extraction identifies individual entities but doesn't capture relationships between them. The system needs to automatically detect when entities appear together to form relationship narratives.

## The Solution: Entity Co-occurrence Detection Protocol

### 1. Relationship Pattern Recognition
The system implements "Relationship Historian" pattern that identifies when entities appear together in semantic molecules:
- When 2+ person entities appear in same molecule → `#Relationship` tag
- When person + time reference appear → `#Narrative` tag
- When technical terms appear together → `#Technical` tag
- When location references appear together → `#Location` tag

### 2. Semantic Category Emergence
Instead of granular entity tags, the system uses constrained semantic categories:
- `#Relationship`: People interacting, personal connections
- `#Narrative`: Stories, timelines, memories, sequences
- `#Technical`: Code, architecture, system documentation
- `#Industry`: External market data (Oil, CO2, etc.)
- `#Location`: Geographic or spatial references
- `#Emotional`: High sentiment variance content
- `#Temporal`: Time-based sequences and chronology
- `#Causal`: Cause-effect relationships

### 3. Relationship Narrative Assembly
The system constructs relationship narratives by detecting entity co-occurrence patterns:
```
Input: "Alice and Bob went to the park yesterday"
Process:
  - Detect entities: ["Alice", "Bob"]
  - Detect relationship indicator: "and"
  - Detect time reference: "yesterday"
  - Apply tags: #Relationship, #Narrative
Output: Molecule tagged with relationship and narrative semantics
```

## Implementation Requirements

### 1. Entity Co-occurrence Detection
```typescript
interface SemanticRelationship {
  entity1: string;
  entity2: string;
  type: 'relationship' | 'narrative' | 'technical' | 'location';
  strength: number;  // 0.0-1.0 confidence score
  context: string;   // Surrounding text for verification
}
```

### 2. Relationship Detection Engine
```typescript
class RelationshipDetector {
  detectRelationships(content: string, entities: string[]): SemanticRelationship[]
  findEntityPairs(content: string, entities: string[]): string[]
  determineSemanticCategories(content: string, entityPairs: string[]): SemanticCategory[]
}
```

### 3. Entity Pair Processing
- Identify relationship indicators: "and", "with", "met", "told", "said", "visited", etc.
- Detect temporal indicators: "yesterday", "today", "tomorrow", "last week", etc.
- Recognize causal indicators: "because", "therefore", "caused", "led to", etc.
- Apply appropriate semantic categories based on context

## Universal Application Pattern

The same architecture works across domains:

### Personal Domain
```
Input: "Alice and Bob went to the park yesterday"
Entities: ["Alice", "Bob"]
Relationship: "and" (indicating interaction)
Temporal: "yesterday"
Output: #Relationship, #Narrative tagged molecule
```

### Industrial Domain
```
Input: "CO2 sequestration increased with pressure"
Entities: ["CO2", "sequestration"]
Relationship: "with" (indicating correlation)
Quantitative: "increased" (indicating causality)
Output: #Industry, #Causal tagged molecule
```

### Technical Domain
```
Input: "CozoDB and ECE work together for semantic search"
Entities: ["CozoDB", "ECE"]
Relationship: "work together" (indicating integration)
Functional: "semantic search" (indicating purpose)
Output: #Technical, #Relationship tagged molecule
```

## Performance Targets
- Entity Co-occurrence Detection: 95% accuracy in relationship identification
- Semantic Category Assignment: 90% accuracy in category mapping
- Processing Speed: <10ms per semantic molecule
- Memory Usage: <1MB additional memory for relationship tracking

## Validation Criteria
1. Entity pairs in same semantic molecule must be detected as relationships
2. Person + time combinations must generate narrative tags
3. Technical term co-occurrence must generate technical tags
4. Cross-domain relationship detection must work consistently
5. Performance metrics must remain within acceptable ranges

## Compliance Verification
- [ ] Entity co-occurrence detection implemented and tested
- [ ] Semantic category assignment working correctly
- [ ] Relationship narrative assembly functioning
- [ ] Cross-domain relationship detection validated
- [ ] Performance benchmarks met
- [ ] Accuracy metrics verified

## Change Capture
This standard was created to implement the Relationship Historian pattern that enables the system to extract relationship narratives from entity co-occurrence patterns across any domain, making the ECE a truly universal context engine capable of understanding relationships in personal, industrial, and technical contexts.