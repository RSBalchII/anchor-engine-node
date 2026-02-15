# Data Flow Diagram for ECE_Core

## High-Level Data Flow

```mermaid
graph TD
    subgraph "Input Sources"
        A[Raw Content<br/>Files, APIs, Streams]
        B[User Queries<br/>Natural Language]
        C[External Sources<br/>Web, Databases]
    end

    subgraph "Processing Pipeline"
        D[Refiner<br/>Content Sanitization]
        E[Atomizer<br/>Content Splitting]
        F[Fingerprint<br/>SimHash Generation]
        G[Tagger<br/>Semantic Classification]
        H[Indexer<br/>Database Storage]
    end

    subgraph "Storage Layer"
        I[(PGlite Database)]
        J[Atoms Table<br/>Individual Knowledge Units]
        K[Tags Table<br/>Semantic Relationships]
        L[Edges Table<br/>Connections Between Atoms]
        M[Sources Table<br/>Document Origins]
    end

    subgraph "Retrieval Pipeline"
        N[Query Parser<br/>NLP Processing]
        O[Tag-Walker<br/>Graph Traversal]
        P[Context Assembler<br/>Result Aggregation]
        Q[Response Formatter<br/>Output Preparation]
    end

    subgraph "Output Destinations"
        R[Search Results<br/>Structured Output]
        S[Chat Context<br/>LLM Input]
        T[Export Formats<br/>JSON, CSV, Tables]
    end

    A --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    I --> K
    I --> L
    I --> M

    B --> N
    C --> N
    N --> O
    O --> I
    I --> P
    P --> Q
    Q --> R
    Q --> S
    Q --> T

    J --> O
    K --> O
    L --> O
    M --> O
```

## Atomic Architecture Flow

```mermaid
graph TD
    subgraph "Compound (Source Document)"
        CP[Compound<br/>ID: comp_[hash of path+content]<br/>Path: /context/notebook/file.md<br/>Timestamp: 1234567890<br/>Provenance: internal<br/>Molecular Signature: abc123def456]
    end

    subgraph "Molecules (Semantic Chunks)"
        M1[Molecule 1<br/>ID: mol_[hash of content]<br/>Content: 'This is the first paragraph'<br/>Compound ID: comp_[...]<br/>Sequence: 0<br/>Start Byte: 0<br/>End Byte: 25<br/>Type: prose<br/>Numeric Value: null<br/>Numeric Unit: null<br/>Molecular Signature: def456ghi789]
        
        M2[Molecule 2<br/>ID: mol_[hash of content]<br/>Content: 'const x = 5; // code example'<br/>Compound ID: comp_[...]<br/>Sequence: 1<br/>Start Byte: 26<br/>End Byte: 60<br/>Type: code<br/>Numeric Value: 5<br/>Numeric Unit: null<br/>Molecular Signature: ghi789jkl012]

        M3[Molecule 3<br/>ID: mol_[hash of content]<br/>Content: 'The results were 42.5 meters'<br/>Compound ID: comp_[...]<br/>Sequence: 2<br/>Start Byte: 61<br/>End Byte: 95<br/>Type: prose<br/>Numeric Value: 42.5<br/>Numeric Unit: meters<br/>Molecular Signature: jkl012mno345]
    end

    subgraph "Atoms (Semantic Units)"
        A1[Atom: #project:ECE_Core<br/>Type: system<br/>Weight: 1.0]
        A2[Atom: #src<br/>Type: system<br/>Weight: 1.0]
        A3[Atom: #code<br/>Type: system<br/>Weight: 1.0]
        A4[Atom: #typescript<br/>Type: concept<br/>Weight: 0.8]
        A5[Atom: #database<br/>Type: concept<br/>Weight: 0.9]
        A6[Atom: #numeric<br/>Type: measurement<br/>Weight: 0.7]
    end

    subgraph "Database Storage"
        X[(PGlite Database)]
        Y[Compounds Table<br/>- id<br/>- compound_body<br/>- path<br/>- timestamp<br/>- provenance<br/>- molecular_signature<br/>- atoms<br/>- molecules<br/>- embedding]
        
        Z[Molecules Table<br/>- id<br/>- content<br/>- compound_id<br/>- sequence<br/>- start_byte<br/>- end_byte<br/>- type<br/>- numeric_value<br/>- numeric_unit<br/>- molecular_signature<br/>- embedding<br/>- timestamp]
        
        AA[Atoms Table<br/>- id<br/>- content<br/>- source_path<br/>- source_id<br/>- sequence<br/>- type<br/>- hash<br/>- buckets<br/>- tags<br/>- epochs<br/>- provenance<br/>- simhash<br/>- embedding]
    end

    CP --> M1
    CP --> M2
    CP --> M3

    M1 --> A1
    M1 --> A2
    M1 --> A4
    M2 --> A3
    M2 --> A4
    M3 --> A5
    M3 --> A6

    CP --> Y
    M1 --> Z
    M2 --> Z
    M3 --> Z
    A1 --> AA
    A2 --> AA
    A3 --> AA
    A4 --> AA
    A5 --> AA
    A6 --> AA

    Y --> X
    Z --> X
    AA --> X
```

## Ingestion Data Flow

```mermaid
sequenceDiagram
    participant SRC as Content Source
    participant WD as Watchdog Service
    participant ING as Ingestion Service
    participant REF as Refiner Service
    participant ATM as Atomizer Service
    participant FNG as Fingerprint Service
    participant DB as PGlite Database
    participant IDX as Indexer Service

    SRC->>WD: New content detected
    WD->>ING: Ingest content request
    ING->>REF: Sanitize and preprocess content
    REF->>ATM: Split content into semantic molecules
    ATM->>ATM: Apply prose/code splitting strategies
    ATM->>FNG: Generate fingerprints for deduplication
    FNG->>ATM: SimHash fingerprint
    ATM->>ING: Processed molecules with fingerprints
    ING->>DB: Store atoms/molecules with deduplication
    DB->>IDX: Update search indices
    IDX->>DB: Index updated
    DB->>ING: Storage confirmation
    ING->>WD: Ingestion complete
```

## Search Data Flow

```mermaid
graph LR
    subgraph "Query Input"
        QA[User Query<br/>Natural Language]
        QB[Query Parameters<br/>Buckets, Tags, Budget]
    end

    subgraph "Processing Layer"
        QC[Query Parser<br/>NLP Processing]
        QD[Query Expansion<br/>Synonym Mapping]
        QE[Tag-Walker<br/>Graph Traversal]
        QF[Context Assembly<br/>Result Aggregation]
    end

    subgraph "Database Layer"
        QG[(PGlite Database)]
        QH[Atoms Table<br/>Full-Text Search Index]
        QI[Tags Table<br/>Relationship Index]
        QJ[Edges Table<br/>Connection Index]
    end

    subgraph "Output Layer"
        QK[Result Scoring<br/>Relevance Ranking]
        QL[Duplicate Filtering<br/>SimHash Deduplication]
        QM[Response Formatting<br/>Standard Output]
    end

    QA --> QC
    QB --> QC
    QC --> QD
    QD --> QE
    QE --> QG
    QG --> QH
    QG --> QI
    QG --> QJ
    QH --> QF
    QI --> QF
    QJ --> QF
    QF --> QK
    QK --> QL
    QL --> QM
```

## Agent Harness Integration Flow

```mermaid
sequenceDiagram
    participant AH as Agent Harness (e.g., OpenCLAW)
    participant API as REST API
    participant SR as Search Service
    participant DB as PGlite Database
    participant NS as Native Services (C++)
    
    AH->>API: Query request (e.g., "What is the latest state?")
    API->>SR: Process search request
    SR->>DB: Execute Tag-Walker search
    DB->>NS: Native module acceleration (if needed)
    NS-->>DB: Processed results
    DB-->>SR: Retrieved context atoms
    SR-->>API: Formatted context results
    API-->>AH: Return context + agent logic response
```

## Backup/Restore Data Flow

```mermaid
graph TD
    subgraph "Backup Process"
        BA[Backup Request<br/>POST /v1/backup]
        BB[Database Export<br/>PGlite dump]
        BC[Compression<br/>ZIP/TAR packaging]
        BD[File Storage<br/>backups/ directory]
    end

    subgraph "Restore Process"
        BE[Restore Request<br/>POST /v1/backup/restore]
        BF[File Validation<br/>Checksum verification]
        BG[Decompression<br/>Extract backup archive]
        BH[Database Import<br/>PGlite restore]
        BI[Schema Validation<br/>Table structure check]
    end

    BA --> BB
    BB --> BC
    BC --> BD

    BE --> BF
    BF --> BG
    BG --> BH
    BH --> BI
```