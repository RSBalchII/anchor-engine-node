# ECE_Core Architecture Diagrams

## 1. Overall System Architecture

```mermaid
graph TB
    subgraph "Application Layer"
        A[Frontend Dashboard<br/>React + Vite]
        B[Electron Overlay<br/>Always-on-Top]
        C[REST API<br/>Express Server]
    end

    subgraph "Core Engine"
        D[Node.js Shell<br/>Orchestration & Networking]

        subgraph "Native Modules (C++)"
            E[Atomizer<br/>Content Splitting]
            F[Key Assassin<br/>Content Sanitization]
            G[Fingerprint<br/>SimHash Generation]
            H[Distance<br/>Similarity Calculation]
        end

        subgraph "Database Layer"
            I[PGlite<br/>PostgreSQL-Compatible]
            J[Storage Backend<br/>Persistent Storage]
        end

        subgraph "Services"
            K[Ingestion Service<br/>Atomic Pipeline]
            L[Search Service<br/>Tag-Walker Protocol]
            M[Watchdog<br/>File Monitoring]
            N[Dreamer<br/>Self-Organization]
        end
    end

    subgraph "Utilities"
        O[Path Manager<br/>Cross-Platform Paths]
        P[Native Module Manager<br/>Graceful Degradation]
        Q[Performance Monitor<br/>Metrics Collection]
        R[Structured Logger<br/>Context-Aware Logging]
    end

    A --> C
    B --> C
    C --> D
    D --> E
    D --> F
    D --> G
    D --> H
    D --> I
    D --> K
    D --> L
    D --> M
    D --> N
    I --> J
    D --> O
    D --> P
    D --> Q
    D --> R
```

## 2. Atomic Architecture Flow

```mermaid
flowchart TD
    A[Raw Content<br/>Text File, Code, etc.] --> B{Content Type}

    B -->|Prose| C[Prose Processing<br/>Sentence Splitting]
    B -->|Code| D[Code Processing<br/>AST-based Splitting]
    B -->|Data| E[Data Processing<br/>Row/Line Splitting]

    C --> F[Sanitization<br/>Key Assassin Protocol]
    D --> F
    E --> F

    F --> G[Semantic Analysis<br/>Entity Extraction]
    G --> H[Semantic Categorization<br/>Relationship/Narrative/Technical Tags]

    H --> I[Compound Creation<br/>ID: comp_[hash of content+path]<br/>Contains full content]
    I --> J[Molecule Extraction<br/>Semantic Segments<br/>with byte coordinates]

    J --> K[Molecule 1<br/>ID: mol_[hash]<br/>Content: [segment text]<br/>Start: [byte offset]<br/>End: [byte offset]<br/>Type: prose/code/data<br/>Sequence: 0]

    J --> L[Molecule 2<br/>ID: mol_[hash]<br/>Content: [segment text]<br/>Start: [byte offset]<br/>End: [byte offset]<br/>Type: prose/code/data<br/>Sequence: 1]

    J --> M[Other Molecules<br/>...]

    G --> N[System Atoms<br/>#project, #src, #code, etc.]
    H --> O[Semantic Atoms<br/>#Relationship, #Narrative, etc.]
    K --> P[K-Molecule Atoms<br/>Specific entities in segment]
    L --> Q[L-Molecule Atoms<br/>Specific entities in segment]
    M --> R[Other Molecule Atoms<br/>...]

    I --> S[Compound Atoms<br/>Aggregated from all molecules]
    I --> T[Compound Molecules<br/>IDs of all molecules]

    K --> U[Molecule-Compound Link<br/>compoundId reference]
    L --> U
    M --> U

    N --> V[Atom Deduplication<br/>Remove duplicates across system]
    O --> V
    P --> V
    Q --> V
    R --> V

    V --> W[Final Atoms<br/>Unique atom IDs with labels]

    I --> X{Persist to Database}
    K --> X
    L --> X
    M --> X
    W --> X

    X --> Y[PGlite Tables:<br/>- compounds table<br/>- molecules table<br/>- atoms table<br/>- atom_edges table]
```

## 3. Tag-Walker Search Protocol

```mermaid
graph TD
    A[User Query<br/>"Revenue optimization summary"] --> B[Phase 1: Intelligent Parsing<br/>Remove stopwords & detect intent]

    B --> C{Strict Search<br/>GIN Index}
    C -->|Results Found| D[Anchor set established]
    C -->|No Results| E[Phase 3: Fuzzy Fallback<br/>Switch to OR-logic]

    E -->|Results Found| D
    E -->|No Results| F[Return Empty/Suggestions]

    D --> G[Phase 4: Semantic Walk<br/>Tag-Walker Protocol]

    subgraph "Walk Logic"
        G --> H{Bucket Filter?}
        H -->|Yes| I[Strict Sandbox<br/>Only Atoms in same Bucket]
        H -->|No| J[Global Walk<br/>Cross-Corpus Associates]
    end

    I --> K[Candidate Neighbors]
    J --> K

    K --> L[Scoring & Ranking<br/>Provenance + Tag Overlap]

    L --> M{Sort Intent?}
    M -->|'Earliest'| N[Sort by Timestamp ASC]
    M -->|Default| O[Sort by Score + Timestamp DESC]

    N --> P[Final Result Set]
    O --> P
```

## 4. Native Module Integration

```mermaid
graph TD
    A[Node.js Application] --> B[N-API Boundary]

    B --> C[C++ Native Module<br/>Performance-Critical Operations]

    C --> D[Atomizer<br/>std::string_view for zero-copy]
    C --> E[Key Assassin<br/>Content sanitization]
    C --> F[Fingerprint<br/>SimHash generation]
    C --> G[Distance<br/>Hamming distance calculation]

    D --> H[Memory Efficiency<br/>Avoid unnecessary copies]
    E --> H
    F --> H
    G --> H

    A --> I[JavaScript Fallback<br/>Graceful degradation]
    I --> J[Same API Interface<br/>Ensures compatibility]

    A --> K[Native Module Manager<br/>Handles loading & fallbacks]
    K --> L[Load native module]
    K --> M[Activate fallback if native fails]

    L --> N{Native module available?}
    N -->|Yes| O[Use native implementation]
    N -->|No| P[Use JavaScript fallback]

    O --> Q[2.3x performance improvement]
    P --> R[Compatible functionality]
```

## 5. Agent Harness Integration

```mermaid
graph TB
    subgraph "Agent Harness"
        A[Agent Query]
        B[Agent Logic]
        C[Agent Response]
    end

    subgraph "ECE/Anchor Data Atomization Service"
        D[Query Processing]
        E[Context Retrieval]
        F[Semantic Search]
        G[Data Formatting]
    end

    A --> D
    D --> E
    E --> F
    F --> G
    G --> B
    B --> C

    subgraph "Database Layer"
        H[PGlite Storage]
        I[Atoms Table]
        J[Tags Table]
        K[Relationships Table]
    end

    E --> H
    H --> I
    H --> J
    H --> K
```

## 6. Build & Deployment Pipeline

```mermaid
graph LR
    A[Source Code<br/>TypeScript, C++, Assets] --> B[Package Management<br/>PNPM workspace]

    B --> C[Frontend Build<br/>Vite + RollDown bundling]
    B --> D[Engine Build<br/>TypeScript compilation]
    B --> E[Native Module Build<br/>node-gyp compilation]

    C --> F[Frontend Bundle<br/>Optimized assets]
    D --> G[Engine Artifacts<br/>Compiled JavaScript]
    E --> H[Native Binaries<br/>.node files per platform]

    F --> I[Electron Packaging<br/>Cross-platform app bundling]
    G --> I
    H --> I

    I --> J[Electron App<br/>Windows, macOS, Linux]

    J --> K[Deployment<br/>Distribute to users]
```