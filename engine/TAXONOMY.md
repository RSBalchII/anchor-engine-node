# Anchor-Engine Taxonomy

This document explains the core taxonomy used in the Anchor-Engine for organizing and retrieving information.

## Core Concepts

### Atoms
- **Definition**: The smallest semantic units of information, representing individual entities or concepts
- **Characteristics**:
  - Contain specific, granular information
  - Represent entities like people, places, dates, technical terms
  - Have unique IDs and metadata
  - Are the foundational building blocks of the knowledge graph
- **Examples**: "John Smith", "New York", "2023-07-15", "machine learning"
- **Database Table**: Stored in the `atoms` table

### Molecules  
- **Definition**: Semantic groupings that represent relationships between atoms
- **Characteristics**:
  - Connect related atoms to form meaningful relationships
  - Represent connections like "John Smith lives in New York"
  - Enable associative retrieval through graph traversal
  - Serve as edges in the knowledge graph
- **Examples**: "Person-Location relationship", "Temporal association", "Cause-effect connection"
- **Database Table**: Relationships stored in the `edges` table, with metadata in `molecules` table

### Compounds
- **Definition**: Contextually inflated units that expand atomic information to user-defined token limits
- **Characteristics**:
  - Generated from atoms when more context is needed
  - Expand single atoms into broader contextual windows
  - Respect user-defined token budgets
  - Provide enriched context for search results
- **Examples**: Expanding "John Smith" atom to include surrounding paragraph or document context
- **Database Table**: Stored in the `compounds` table

## Relationship Between Elements

```
Atoms (entities) → Molecules (relationships) → Compounds (context inflation)
```

1. **Atoms** are the base entities containing specific information
2. **Molecules** connect atoms to form relationships and associations
3. **Compounds** inflate atomic information to provide broader context when needed

## Practical Applications

### Search Process
1. Query terms are matched to **Atoms** (specific entities)
2. **Molecules** enable finding related concepts through graph traversal
3. **Compounds** provide enriched context for the final results

### Ingestion Process
1. Content is broken down into **Atoms** (entities and concepts)
2. Relationships between atoms are identified and stored as **Molecules**
3. When needed, **Compounds** are generated to provide contextual windows

This taxonomy enables efficient storage, retrieval, and association of information while maintaining both granular detail and contextual richness.