# System Components Diagram for ECE_Core

## High-Level Architecture

```mermaid
graph TB
    subgraph "User Interface Layer"
        UI[Web Interface<br/>React/Vanilla]
        EO[Electron Overlay<br/>Always-on-Top]
        CLI[Command Line Interface<br/>Node.js Scripts]
    end

    subgraph "API Gateway Layer"
        AG[Express.js Server<br/>REST API & Health Checks]
        AP[API Routes<br/>/v1/memory/*, /health, /monitoring]
        MW[Middlewares<br/>CORS, Body Parsing, Auth]
    end

    subgraph "Core Engine Layer"
        CE[Node.js Shell<br/>Orchestration & Networking]

        subgraph "Native Modules (C++)"
            AM[Atomizer<br/>Content Splitting]
            KA[Key Assassin<br/>Content Sanitization]
            FP[Fingerprint<br/>SimHash Generation]
            DS[Distance<br/>Similarity Calculation]
        end

        subgraph "Database Layer"
            DB[(PGlite<br/>PostgreSQL-Compatible)]
            TA[Atoms Table<br/>Individual Knowledge Units]
            TT[Tags Table<br/>Semantic Relationships]
            TE[Edges Table<br/>Connections Between Atoms]
            TS[Sources Table<br/>Document Origins]
        end

        subgraph "Core Services"
            IS[Ingestion Service<br/>Content Processing Pipeline]
            SS[Search Service<br/>Tag-Walker Protocol]
            WS[Watchdog Service<br/>File System Monitoring]
            DS[Dreamer Service<br/>Background Processing]
            BS[Backup Service<br/>Snapshot Management]
        end
    end

    subgraph "Utilities & Infrastructure"
        PM[Path Manager<br/>Cross-Platform Paths]
        NMM[Native Module Manager<br/>Graceful Degradation]
        RM[Resource Manager<br/>Memory Optimization]
        LM[Logger Manager<br/>Structured Logging]
    end

    UI --> AG
    EO --> AG
    CLI --> AG
    AG --> AP
    AP --> CE
    CE --> AM
    CE --> KA
    CE --> FP
    CE --> DS
    CE --> DB
    CE --> IS
    CE --> SS
    CE --> WS
    CE --> DS
    CE --> BS
    DB --> TA
    DB --> TT
    DB --> TE
    DB --> TS
    CE --> PM
    CE --> NMM
    CE --> RM
    CE --> LM
```

## Service Interaction Flow

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant API as API Service
    participant IS as Ingestion Service
    participant SS as Search Service
    participant WS as Watchdog Service
    participant DB as PGlite Database
    participant NS as Native Services

    UI->>API: Ingest content request
    API->>IS: Process ingestion
    IS->>NS: Native atomization
    NS-->>IS: Processed atoms
    IS->>DB: Store atoms with deduplication
    DB-->>IS: Storage confirmation
    IS-->>API: Ingestion result
    API-->>UI: Confirmation

    Note over WS, DB: File system monitoring runs continuously
    WS->>WS: Detect file changes
    WS->>IS: Trigger ingestion for new files
    IS->>NS: Process new content
    NS-->>IS: Processed atoms
    IS->>DB: Store new atoms
    DB-->>IS: Confirmation

    UI->>API: Search query
    API->>SS: Execute search
    SS->>DB: Query database
    DB-->>SS: Retrieved results
    SS-->>API: Formatted results
    API-->>UI: Search results
```

## Data Flow Architecture

```mermaid
graph LR
    subgraph "Input Sources"
        FS[File System<br/>context/ directory]
        API_IN[API Ingestion<br/>POST /v1/ingest]
        WB[Web Scraping<br/>Research Plugin]
    end

    subgraph "Processing Pipeline"
        RF[Refiner<br/>Content Sanitization]
        AT[Atomizer<br/>Content Splitting]
        FN[Fingerprint<br/>SimHash Generation]
        TG[Tagger<br/>Semantic Classification]
        ST[Storage<br/>Database Insertion]
    end

    subgraph "Storage Layer"
        DB[(PGlite Database)]
        TB[Atoms Table]
        TC[Tags Table]
        TD[Edges Table]
        TE[Sources Table]
    end

    subgraph "Retrieval Pipeline"
        SQ[Search Query<br/>Natural Language]
        TW[Tag-Walker<br/>Graph Traversal]
        CT[Context Assembly<br/>Result Aggregation]
        RP[Response Prep<br/>Output Formatting]
    end

    subgraph "Output Destinations"
        UI[User Interface<br/>Search Results]
        AH[Agent Harness<br/>Context Injection]
        EX[Export Formats<br/>JSON, CSV, Tables]
    end

    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
    K --> L
    L --> M
    L --> N
    L --> O
    M --> P
    N --> P
    O --> P
```

## Native Module Integration

```mermaid
graph TD
    subgraph "Node.js Layer"
        JS[JavaScript Application<br/>Express, Services, etc.]
        NAPI[N-API Boundary<br/>Stable Interface]
        NM[Native Module Manager<br/>Loading & Fallbacks]
    end

    subgraph "C++ Native Layer"
        AM[Atomizer Module<br/>Content Splitting<br/>std::string_view]
        KM[Key Assassin Module<br/>Content Sanitization<br/>Zero-Copy Processing]
        FM[Fingerprint Module<br/>SimHash Generation<br/>Performance Critical]
        DM[Distance Module<br/>Similarity Calculation<br/>SIMD Optimized]
    end

    subgraph "Fallback Layer"
        JSF[JavaScript Fallbacks<br/>Pure JS Implementations]
    end

    A --> B
    B --> C
    C --> D
    C --> E
    C --> F
    C --> G
    D --> H
    E --> H
    F --> H
    G --> H
    H --> I
    H --> J
```

## Agent Harness Integration Architecture

```mermaid
graph TB
    subgraph "Agent Harness (e.g., OpenCLAW)"
        AH[Agent Query<br/>Natural Language]
        AL[Agent Logic<br/>Reasoning & Planning]
        AR[Agent Response<br/>Processed Output]
    end

    subgraph "ECE/Anchor Data Atomization Service"
        AA[Query Processing<br/>NLP & Intent Detection]
        AB[Context Retrieval<br/>Tag-Walker Search]
        AC[Semantic Search<br/>Graph Traversal]
        AD[Data Formatting<br/>JSON/CSV/Tables]
    end

    subgraph "Database Layer"
        AE[(PGlite Storage)]
        AF[Atoms Table<br/>Knowledge Units]
        AG[Tags Table<br/>Relationships]
        AH[Edges Table<br/>Connections]
    end

    subgraph "Native Acceleration"
        AI[Native Modules<br/>Performance Boost]
        AJ[C++ Processing<br/>SIMD Operations]
    end

    A --> D
    B --> E
    C --> F
    D --> G
    E --> G
    F --> G
    G --> H
    G --> I
    G --> J
    H --> K
    I --> K
    J --> K
    K --> L
    K --> M
    L --> N
    M --> N
```

## Monitoring & Health Architecture

```mermaid
graph LR
    subgraph "Health Monitoring"
        HA[Health API<br/>GET /health]
        HB[Component Status<br/>Database, Services, etc.]
        HC[Performance Metrics<br/>Response Times, Memory]
        HD[Resource Utilization<br/>CPU, Disk, Network]
    end

    subgraph "Monitoring Endpoints"
        ME[/monitoring/metrics<br/>Prometheus Format]
        ML[/monitoring/logs<br/>Recent Log Entries]
        MC[/monitoring/components<br/>Detailed Status]
        MR[/monitoring/resources<br/>System Resources]
    end

    subgraph "Alerting & Notifications"
        AA[Anomaly Detection<br/>Performance Thresholds]
        AB[Error Tracking<br/>Exception Monitoring]
        AC[Resource Alerts<br/>Memory, Disk Space]
        AD[Service Degradation<br/>Component Failures]
    end

    A --> E
    B --> F
    C --> G
    D --> H
    E --> I
    F --> I
    G --> I
    H --> I
    I --> J
    I --> K
    I --> L
    I --> M
    J --> N
    K --> N
    L --> N
    M --> N
```