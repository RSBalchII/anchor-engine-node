# Sequence Diagrams for ECE_Core

## 1. Agent Harness Integration Sequence

```mermaid
sequenceDiagram
    participant AH as Agent Harness (e.g., OpenCLAW)
    participant API as REST API (Express)
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

## 2. Data Ingestion Sequence

```mermaid
sequenceDiagram
    participant FC as File Content
    participant WD as Watchdog Service
    participant IS as Ingestion Service
    participant NS as Native Services (C++)
    participant DB as PGlite Database
    
    FC->>WD: New file detected in context/
    WD->>IS: Ingest content request
    IS->>NS: Sanitize content (Key Assassin)
    NS-->>IS: Cleaned content
    IS->>NS: Split content (Atomizer)
    NS-->>IS: Semantic molecules
    IS->>NS: Generate fingerprint (SimHash)
    NS-->>IS: Fingerprint hash
    IS->>DB: Store compound/molecules/atoms
    DB-->>IS: Storage confirmation
    IS-->>WD: Ingestion complete
```

## 3. Search Workflow Sequence

```mermaid
sequenceDiagram
    participant U as User/Agent
    participant API as REST API
    participant SS as Search Service
    participant TP as Tag-Walker Protocol
    participant DB as PGlite Database
    participant NLP as NLP Processor
    
    U->>API: Search query ("revenue optimization summary")
    API->>SS: Process search request
    SS->>NLP: Parse natural language
    NLP-->>SS: Refined query terms
    SS->>TP: Execute Tag-Walker search
    TP->>DB: Phase 1 - Strict search (GIN index)
    DB-->>TP: Initial results or empty
    alt No results found
        TP->>DB: Phase 2 - Fuzzy fallback (OR logic)
        DB-->>TP: Fallback results
    end
    TP->>DB: Phase 3 - Semantic walk (related atoms)
    DB-->>TP: Related context atoms
    TP-->>SS: Final result set
    SS-->>API: Formatted search results
    API-->>U: Return context window
```

## 4. Stateless Context Retrieval Sequence

```mermaid
sequenceDiagram
    participant AH as Agent Harness
    participant API as REST API
    participant CS as Context Service
    participant DB as PGlite Database
    participant IS as Inference Service
    
    AH->>API: Query with context requirement
    API->>CS: Retrieve relevant context
    CS->>DB: Execute semantic search
    DB-->>CS: Retrieved context atoms
    CS-->>API: Formatted context
    API->>IS: Combine context + original query
    IS-->>API: Processed response
    API-->>AH: Return final response
```

## 5. Native Module Integration Sequence

```mermaid
sequenceDiagram
    participant JS as JavaScript Layer
    participant NAPI as N-API Boundary
    participant CPP as C++ Native Module
    participant RES as Result
    
    JS->>NAPI: Call native function (e.g., atomize)
    NAPI->>CPP: Pass parameters via N-API
    CPP->>CPP: Execute performance-critical operation
    CPP-->>NAPI: Return result via N-API
    NAPI-->>JS: Processed result
    JS-->>RES: Final output to caller
```

## 6. Server Startup Sequence (Standard 088 Compliant)

```mermaid
sequenceDiagram
    participant INIT as Initialization
    participant SRV as HTTP Server
    participant DB as Database
    participant SVC as Services
    
    INIT->>SRV: Start HTTP server
    SRV-->>INIT: Server listening on port
    INIT->>DB: Initialize database (background)
    DB-->>INIT: Database ready notification
    INIT->>SVC: Initialize services
    SVC-->>INIT: Services ready
    Note over SRV,DB,SVC: Server available during DB initialization
```