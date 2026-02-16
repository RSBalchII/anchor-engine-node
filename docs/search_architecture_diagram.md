# Search Architecture Diagram for ECE_Core

## Tag-Walker Protocol Overview

```mermaid
graph TD
    subgraph "Query Processing"
        A[User Query<br/>Natural Language]
        B[Query Parser<br/>NLP Processing]
        C[Query Expander<br/>Synonym Mapping]
    end

    subgraph "Search Phases"
        D[Phase 1: FTS Search<br/>PGlite GIN Index]
        E[Phase 2: Tag-Walker<br/>Graph Traversal]
        F[Phase 3: Context Inflation<br/>Molecular Coordinates]
    end

    subgraph "Database Layer"
        G[(PGlite Database)]
        H[Atoms Table<br/>Content + FTS Index]
        I[Tags Table<br/>Semantic Relationships]
        J[Edges Table<br/>Atom Connections]
        K[Engrams Table<br/>Lexical Sidecar]
    end

    subgraph "Results Processing"
        L[Result Scoring<br/>Relevance Ranking]
        M[Duplicate Filtering<br/>SimHash Deduplication]
        N[Response Assembly<br/>Context Window Formation]
    end

    A --> B
    B --> C
    C --> D
    C --> E
    C --> F

    D --> G
    E --> G
    F --> G

    G --> H
    G --> I
    G --> J
    G --> K
    G --> AP

    H --> L
    I --> L
    J --> L
    K --> L
    AP --> L

    L --> M
    M --> N
```

## Detailed Search Flow

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant API as API Service
    participant SS as Search Service
    participant TW as Tag-Walker Protocol
    participant DB as PGlite Database
    participant NS as Native Services

    UI->>API: POST /v1/memory/search {query: "revenue optimization", buckets: ["inbox"], max_chars: 20000}
    API->>SS: executeSearch(query, buckets, maxChars)
    SS->>TW: processQuery(query)
    TW->>DB: Execute FTS search on content
    DB-->>TW: Initial results from GIN index
    alt No Results Found
        TW->>DB: Execute fuzzy fallback (OR logic)
        DB-->>TW: Fallback results
    end
    TW->>TW: Apply Tag-Walker graph traversal
    TW->>DB: Query related atoms via tags/edges
    DB-->>TW: Graph traversal results
    TW->>SS: Curated results with provenance
    SS->>SS: Apply context inflation (Radial Inflation form Disk)
    SS->>DB: Query atom_positions for byte offsets
    SS->>NS: Partial file read (fs.readSync)
    NS-->>SS: Processed results
    SS-->>API: Formatted response with context window
    API-->>UI: Search results (limited by token budget)
```

## Smart Search Protocol (Standard 094)

```mermaid
graph TD
    subgraph "Phase 1: Intelligent Parsing"
        A[Input: "What do we know about revenue optimization summary"]
        B[POS Tagging & Stopword Removal]
        C[Output: "revenue optimization summary"]
    end

    subgraph "Phase 2: Strict Anchor Search"
        D[GIN Index Query<br/>All terms must match]
        E[PGlite FTS with 'simple' dictionary]
        F[Strict AND logic: revenue & optimization & summary]
    end

    subgraph "Phase 3: Fuzzy Fallback"
        G[Trigger: Zero results from Phase 2]
        H[Logical OR query: revenue | optimization | summary]
        I[Retrieve partial matches]
    end

    subgraph "Phase 4: Semantic Walk"
        J[Use seed results as graph nodes]
        K[Traverse related atoms via shared tags]
        L[Pull in associated content]
    end

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F -->|Zero Results| G
    G --> H
    H --> I
    F -->|Results Found| J
    I -->|Results Found| J
    J --> K
    K --> L
```

## Performance Optimization Layers

```mermaid
graph LR
    subgraph "Caching Layer"
        CA[Query Cache<br/>Recent search results]
        CB[Atom Cache<br/>Frequently accessed atoms]
        CC[Embedding Cache<br/>Computed embeddings]
    end

    subgraph "Indexing Layer"
        DA[GIN Index<br/>Full-Text Search]
        DB[B-tree Indices<br/>Tags, Buckets, Timestamps]
        DC[Hash Indices<br/>SimHash for deduplication]
    end

    subgraph "Processing Layer"
        EA[Native Modules<br/>C++ Performance]
        EB[Batch Processing<br/>SIMD Operations]
        EC[Zero-Copy Operations<br/>std::string_view]
    end

    CA --> DA
    CB --> DB
    CC --> DC
    DA --> EA
    DB --> EB
    DC --> EC
```

## Agent Integration Search Flow

```mermaid
sequenceDiagram
    participant AH as Agent Harness
    participant API as REST API
    participant SS as Search Service
    participant TW as Tag-Walker
    participant DB as PGlite
    participant AG as Agent Runtime

    AH->>API: Query with context requirement
    API->>SS: Retrieve relevant context
    SS->>TW: Execute Tag-Walker search
    TW->>DB: Query atoms with semantic matching
    DB-->>TW: Retrieved context atoms
    TW-->>SS: Curated results
    SS-->>API: Formatted context
    API->>AG: Combine context + agent logic
    AG-->>API: Processed response
    API-->>AH: Final response with agent reasoning
```

## Database Schema for Search

```mermaid
graph BT
    subgraph "PGlite Tables"
        AT[Atoms Table<br/>- id (TEXT)<br/>- content (TEXT)<br/>- source_path (TEXT)<br/>- timestamp (REAL)<br/>- buckets (TEXT[])<br/>- tags (TEXT[])<br/>- epochs (TEXT[])<br/>- simhash (TEXT)<br/>- embedding (TEXT)<br/>- provenance (TEXT)<br/>- payload (JSONB)]
        
        TT[Tags Table<br/>- atom_id (TEXT)<br/>- tag (TEXT)<br/>- bucket (TEXT)<br/>PRIMARY KEY (atom_id, tag)]
        
        ET[Edges Table<br/>- source_id (TEXT)<br/>- target_id (TEXT)<br/>- relation (TEXT)<br/>- weight (REAL)<br/>PRIMARY KEY (source_id, target_id, relation)]
        
        ST[Sources Table<br/>- path (TEXT)<br/>- hash (TEXT)<br/>- total_atoms (INTEGER)<br/>- last_ingest (REAL)<br/>PRIMARY KEY (path)]
        
        MT[Molecules Table<br/>- id (TEXT)<br/>- content (TEXT)<br/>- compound_id (TEXT)<br/>- sequence (INTEGER)<br/>- start_byte (INTEGER)<br/>- end_byte (INTEGER)<br/>- type (TEXT)<br/>- numeric_value (REAL)<br/>- numeric_unit (TEXT)<br/>- molecular_signature (TEXT)<br/>- embedding (TEXT)<br/>- timestamp (REAL)]
        
        CT[Compounds Table<br/>- id (TEXT)<br/>- compound_body (TEXT)<br/>- path (TEXT)<br/>- timestamp (REAL)<br/>- provenance (TEXT)<br/>- molecular_signature (TEXT)<br/>- atoms (TEXT)<br/>- molecules (TEXT)<br/>- embedding (TEXT)<br/>PRIMARY KEY (id)]

        AP[Atom Positions Table<br/>- compound_id (TEXT)<br/>- atom_label (TEXT)<br/>- byte_offset (INTEGER)<br/>PRIMARY KEY (compound_id, atom_label, byte_offset)]
    end

    AT -.-> TT
    AT -.-> ET
    AT -.-> ST
    AT -.-> MT
    AT -.-> CT
    AT -.-> AP
```