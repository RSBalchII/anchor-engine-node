# ECE Architecture Diagrams

## System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[Web UI / Electron Overlay]
        API[REST API Interface]
    end

    subgraph "Engine Layer"
        subgraph "Services"
            WD[Watchdog Service]
            AS[Atomizer Service]
            SS[Search Service]
            IS[Ingestion Service]
            MS[Mirror Service]
            DS[Dreamer Service]
        end

        subgraph "Core Components"
            CFG[Configuration Manager]
            DB[(PGlite<br/>PostgreSQL-Compatible)]
            PM[Path Manager]
            NMM[Native Module Manager]
        end

        subgraph "Inference"
            INF[Inference Service]
            LW[LLM Workers]
        end
    end

    subgraph "Native Layer"
        NM[C++ Native Modules<br/>Atomization & SimHash]
    end

    subgraph "Data Sources"
        FS[File System<br/>Notebook Directory]
        EXT[External Sources]
    end

    UI --> API
    API --> WD
    API --> SS
    API --> IS
    API --> DS

    WD --> AS
    AS --> NM
    IS --> DB
    SS --> DB
    DS --> DB
    MS --> DB

    AS --> DB
    INF --> LW
    LW --> DB

    FS --> WD
    EXT --> IS
    NM --> DB

    NMM --> NM
    PM --> AllServices
    CFG --> AllServices
```

## Atomic Taxonomy: Atom -> Molecule -> Compound

```mermaid
graph TD
    subgraph "Compound (Document/File)"
        C[Compound<br/>ID: comp_xxx<br/>Path: /notebook/file.md<br/>Timestamp: 1234567890<br/>Provenance: internal<br/>Molecular Signature: abc123]
    end

    subgraph "Molecules (Text Segments)"
        M1[Molecule 1<br/>ID: mol_xxx_001<br/>Content: 'This is the first segment'<br/>Sequence: 0<br/>Compound ID: comp_xxx<br/>Start Byte: 0<br/>End Byte: 25<br/>Type: prose<br/>Molecular Signature: def456]

        M2[Molecule 2<br/>ID: mol_xxx_002<br/>Content: 'This is the second segment'<br/>Sequence: 1<br/>Compound ID: comp_xxx<br/>Start Byte: 26<br/>End Byte: 55<br/>Type: prose<br/>Molecular Signature: ghi789]

        M3[Molecule 3<br/>ID: mol_xxx_003<br/>Content: 'Code block here'<br/>Sequence: 2<br/>Compound ID: comp_xxx<br/>Start Byte: 56<br/>End Byte: 80<br/>Type: code<br/>Molecular Signature: jkl012]
    end

    subgraph "Atoms (Semantic Units)"
        A1[Atom: #project:ECE_Core<br/>Type: system<br/>Weight: 1.0]
        A2[Atom: #src<br/>Type: system<br/>Weight: 1.0]
        A3[Atom: #code<br/>Type: system<br/>Weight: 1.0]
        A4[Atom: #typescript<br/>Type: concept<br/>Weight: 0.8]
        A5[Atom: #database<br/>Type: concept<br/>Weight: 0.9]
    end

    C --> M1
    C --> M2
    C --> M3
    M1 --> A1
    M1 --> A2
    M1 --> A4
    M2 --> A1
    M2 --> A5
    M3 --> A3
    M3 --> A4
```

## Ingestion Pipeline

```mermaid
sequenceDiagram
    participant FS as File System
    participant WD as Watchdog
    participant AS as Atomizer
    participant IS as Ingestion Service
    participant DB as PGlite
    participant NM as Native Modules

    FS->>WD: File Change Detected
    WD->>WD: Hash Check & Change Detection
    alt File Changed
        WD->>AS: Request Atomization
        AS->>NM: Sanitize & Process (Native)
        NM->>AS: Processed Content
        AS->>AS: Create Atomic Topology
        AS->>IS: Send Compound/Molecules/Atoms
        IS->>DB: Persist to Database
        IS->>WD: Confirmation
    end
```

## Search Architecture (Tag-Walker Protocol)

```mermaid
graph LR
    subgraph "Query Processing"
        QP[Query Parser<br/>NLP Processing]
        QE[Query Expander<br/>Tag Matching]
    end

    subgraph "Search Strategies"
        FTS[FTS Search<br/>PGlite GIN Index]
        TW[Tag-Walker<br/>Graph Traversal]
        EI[Engram Lookup<br/>O(1) Access]
    end

    subgraph "Results Processing"
        CI[Context Inflator<br/>Molecular Coordinates]
        RS[Result Scorer<br/>Provenance & Type Boosting]
        DF[Duplicate Filter<br/>SimHash Comparison]
    end

    subgraph "Database"
        TBL_MEM[(atoms table)]
        TBL_MOL[(molecules table)]
        TBL_ATOM[(tags table)]
        TBL_EDGE[(edges table)]
        TBL_ENG[(engrams table)]
    end

    QP --> QE
    QE --> FTS
    QE --> TW
    QE --> EI

    FTS --> TBL_MEM
    TW --> TBL_MEM
    TW --> TBL_ATOM
    TW --> TBL_EDGE
    EI --> TBL_ENG

    TBL_MEM --> CI
    TBL_MOL --> CI
    CI --> RS
    RS --> DF
```