# Standard 084: Semantic Shift Architecture (The "Relationship Historian")

**Status:** Active | **Domain:** 00-CORE | **Category:** Architecture & Cognitive Design

## 1. Core Philosophy: "From Keyword Index to Semantic Graph"

The ECE transitions from a "Keyword Index" (dumb) to a "Semantic Graph" (smart) by redefining **Atoms as Entities** and **Molecules as Narrative Containers**. This transforms the ECE from a storage locker into a historian that can extract relationship narratives from any domain.

### 1.1 The Problem: Keyword Sprawl
- **Legacy System**: Generated granular tags like `#FF0000`, `#January`, `#2025` causing tag sprawl
- **Result**: Search results mixed personal relationships with technical logs
- **Impact**: "Search for Jade" returned every file with "Jade" regardless of context

### 1.2 The Solution: Semantic Categories
- **New System**: Uses constrained high-level semantic categories (`#Relationship`, `#Narrative`, `#Technical`)
- **Result**: Relationship-focused queries return only relationship content
- **Impact**: "Search for Jade in #Relationship" returns only personal interactions

## 2. Architecture Evolution

### 2.1 The New Hierarchy
```
Compound (File) -> Molecule (Semantic Chunk) -> Atom (Entity)
```

Where:
- **Compound**: The source file (e.g., `journal_entry.yaml`)
- **Molecule**: The text chunk with semantic meaning (e.g., paragraph/sentence)
- **Atom**: The atomic entity within molecules (e.g., "Alice", "Bob", "Albuquerque")

### 2.2 Semantic Category System
Instead of unlimited granular tags, the system uses constrained semantic categories:

- `#Relationship`: People interacting, personal connections
- `#Narrative`: Stories, timelines, memories, sequences  
- `#Technical`: Code, architecture, system documentation
- `#Industry`: External market data (Oil, CO2, etc.)
- `#Location`: Geographic or spatial references
- `#Emotional`: High sentiment variance content
- `#Temporal`: Time-based sequences and chronology
- `#Causal`: Cause-effect relationships

## 3. Relationship Discovery Protocol

### 3.1 Tag Emergence Logic
Semantic tags emerge from the interaction of entities within semantic molecules:

- **Relationship Trigger**: When 2+ person entities appear in the same molecule → `#Relationship` tag
- **Narrative Trigger**: When person + time reference appear → `#Narrative` tag  
- **Technical Trigger**: When technical terms appear → `#Technical` tag
- **Location Trigger**: When location references appear → `#Location` tag

### 3.2 Entity Co-occurrence Detection
The system identifies relationship patterns by detecting when entities appear together:

```
Input: "Alice and Bob went to the park yesterday"
Process:
  - Detect entities: ["Alice", "Bob"]
  - Detect relationship indicator: "and"
  - Detect time reference: "yesterday"
  - Apply tags: #Relationship, #Narrative
Output: Molecule tagged with relationship and narrative semantics
```

## 4. Implementation Details

### 4.1 Semantic Molecule Processor
- Processes text chunks into semantic molecules with high-level tags
- Extracts atomic entities from within semantic molecules
- Implements "Tag Emergence" protocol where tags emerge from entity interactions

### 4.2 Stateless Contextual Chat
- Each query gets fresh context from ECE search results
- Model operates without session memory
- Responses grounded solely in retrieved ECE data and current prompt

### 4.3 Universal Application
The same architecture works across domains:
- **Personal Domain**: Alice/Bob relationship narratives
- **Industrial Domain**: CO2/Sequestration/Oil industry relationships
- **Technical Domain**: Code component relationships

## 5. Benefits

### 5.1 Improved Search Relevance
- Relationship queries return only relationship content
- Technical queries return only technical content
- Narrative queries return only narrative content

### 5.2 Reduced Tag Sprawl
- Constrained semantic categories prevent unlimited tag growth
- Clear taxonomy prevents ambiguous tagging
- Domain-agnostic categories work across all data types

### 5.3 Enhanced Narrative Discovery
- Entity co-occurrence patterns reveal relationship narratives
- Temporal sequences construct timeline stories
- Cross-domain relationships become discoverable

## 6. Quality Assurance

### 6.1 Testing Requirements
- Verify relationship detection works for entity pairs
- Test semantic category application accuracy
- Validate cross-domain narrative extraction
- Confirm backward compatibility with existing functionality

### 6.2 Performance Metrics
- Search relevance: Relationship queries should return 90%+ relationship content
- Tag accuracy: Semantic categories should match content intent 95%+ of the time
- Performance: Entity co-occurrence detection should add <100ms to search time

---
**Created:** 2026-01-30  
**Last Updated:** 2026-01-30  
**Authority:** System Core