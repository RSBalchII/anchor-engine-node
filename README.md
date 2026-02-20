# Anchor Engine (Memory)

**Version:** 4.0.0 | **Role:** Semantic Memory & Search API | **Port:** 3160

The **Anchor Engine** is the backend service responsible for **ingesting**, **indexing**, and **retrieving** your personal data. It runs as a local API server that other components (like `anchor-ui` or `nanobot-node`) query to retrieve context.

## 🏗️ Architecture: Disposable Index

**Critical:** The PGlite database is **NOT** the source of truth. It is a **rebuildable index** containing only:
- Byte-offset pointers (`source_path`, `start_byte`, `end_byte`)
- Tags and atom metadata
- SimHash fingerprints for deduplication

**Actual content lives in** `mirrored_brain/` — a plain filesystem mirror of all ingested files.

### Why This Design?

| Benefit | Explanation |
|---------|-------------|
| **Zero Data Loss** | DB wiped on shutdown → re-ingest from `mirrored_brain/` on start |
| **Instant Backup** | Copy `mirrored_brain/` directory (no DB dumps) |
| **Portable** | Move `mirrored_brain/` to any machine, re-ingest in seconds |
| **DB Stays Small** | Only pointers + metadata, not full text |
| **Human Readable** | Browse `mirrored_brain/` directly without DB tools |

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. File dropped in inbox/                              │
│     → Mirror Protocol copies to mirrored_brain/@inbox/  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  2. Atomizer splits file into molecules → atoms         │
│     - NLP entity extraction → tags                      │
│     - SimHash fingerprint → deduplication               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  3. PGlite DB stores POINTERS ONLY:                     │
│     {                                                   │
│       atom_id: "abc123",                                │
│       source_path: "@inbox/myfile.txt",                 │
│       start_byte: 15420,    ← Read from here            │
│       end_byte: 15890,      ← to here                   │
│       tags: ["auth", "login"],                          │
│       simhash: "0x7a3f..."                              │
│     }                                                   │
└─────────────────────────────────────────────────────────┘
```

### Search & Retrieval

```
Query: "authentication"
       ↓
Tag-Walker SQL finds matching atoms
       ↓
Returns: [
  { atom_id: "abc123",
    source_path: "@inbox/myfile.txt",
    start_byte: 15420,
    end_byte: 15890,
    gravity_score: 0.87
  }
]
       ↓
Read actual content from mirrored_brain/@inbox/myfile.txt
  - Seek to byte 15420
  - Read 470 bytes (15890 - 15420)
  - Optionally inflate context: read ±50KB for surrounding info
       ↓
Feed to LLM as context
```

## Core Responsibilities

1.  **Ingestion ("The Atomizer")**:
    -   Watches `inbox/`, `external-inbox/` for new files
    -   Parses PDFs, Markdown, Code, and Text
    -   Splits content into atomic units ("Atoms") for granular retrieval
    -   Fingerprints content with SimHash to prevent duplicates

2.  **Indexing (PGlite)**:
    -   Stores **pointers + metadata only** (not full text)
    -   Bipartite graph: Atoms ↔ Tags
    -   Enables full-text search, temporal queries, and graph traversal

3.  **STAR Search API**:
    -   Physics-based tag-walker with gravity scoring
    -   70/30 budget split (Planets/Moons)
    -   Returns byte-offset pointers for context retrieval

4.  **Mirror Protocol**:
    -   Maintains `mirrored_brain/` as source of truth
    -   Supports YAML rehydration (from `read_all.js` format)
    -   Organized by provenance: `@inbox`, `@external`, `@quarantine`

## STAR Search Algorithm

**S**parse **T**emporal **A**ssociative **R**ecall — Physics-based search with deterministic graph traversal.

### The Unified Field Equation

Every connection in the knowledge graph is weighted by:

```
Gravity(atom, anchor) = (SharedTags) × e^(-λ × ΔTime) × (1 - SimHashDistance/64)
```

| Component | Formula | Purpose | Default |
|-----------|---------|---------|---------|
| **SharedTags** | `COUNT(intersection)` | Direct association strength | — |
| **Time Decay** | `e^(-0.00001 × Δt_ms)` | Recent memories weighted higher | λ = 0.00001 |
| **SimHash** | `1 - (hamming/64)` | Content similarity | 64-bit |

### Example Calculation

```
Query: "authentication"

Anchor Atom:
  tags: ["#authentication", "#login"]
  timestamp: 2 hours ago
  simhash: 0x7a3f...

Candidate Atom:
  tags: ["#authentication", "#oauth"]
  timestamp: 1 day ago
  simhash: 0x7a2f...  (2 bits different)

Calculation:
  SharedTags = 1 (both have #authentication)
  TimeDecay = e^(-0.00001 × 22h × 3600s) = e^(-0.792) ≈ 0.45
  SimHashSimilarity = 1 - (2/64) = 0.97
  
  Gravity Score = 1 × 0.45 × 0.97 = 0.44  ← Strong association
```

### Search Phases (70/30 Budget)

**Phase 1: Planets (70% of token budget)**
- Direct keyword FTS matches
- High-confidence, explicit anchors
- Example: "authentication" → atoms containing "authentication"

**Phase 2: Moons (30% of token budget)**
- Graph-discovered associations via tag-walker
- Serendipitous connections you didn't know existed
- Example: "authentication" → also finds "oauth", "session", "jwt" via shared tags

**Phase 3: Fusion Scoring**
- Merge planets + moons with gravity-weighted ranking
- Adaptive: specific queries → more planets; exploratory → more moons

### SQL Implementation

The tag-walker uses CTE-optimized bipartite traversal:

```sql
WITH anchor_tags AS (
  SELECT tag_id FROM atom_tags WHERE atom_id IN (:anchorIds)
),
connected_atoms AS (
  SELECT 
    a.id,
    COUNT(*) as shared_tags,
    a.timestamp,
    a.simhash
  FROM atoms a
  JOIN atom_tags at ON a.id = at.atom_id
  WHERE at.tag_id IN (SELECT tag_id FROM anchor_tags)
  GROUP BY a.id
)
SELECT 
  id,
  shared_tags,
  EXP(-0.00001 * ABS(EXTRACT(EPOCH FROM NOW() - timestamp))) as time_decay,
  shared_tags * EXP(-0.00001 * ABS(EXTRACT(EPOCH FROM NOW() - timestamp))) as gravity
FROM connected_atoms
ORDER BY gravity DESC
LIMIT 50;
```

### Performance

| Metric | Target | Current |
|--------|--------|---------|
| Search latency (p95) | <200ms | ~150ms |
| Ingestion throughput | >100 atoms/sec | Achieved |
| SimHash dedup | <5ms/atom | ~2ms |
| Graph size | 1M+ atoms | Tested |

### Search
`GET /api/search?q=your+query`
-   Returns a JSON list of relevant "Atoms" (paragraphs/code blocks).
-   Used by `anchor-ui` to inject memory into the LLM context.

### Ingest
`POST /api/ingest`
-   Upload text or files programmatically.

### System
`GET /health`
-   Service status check.

## Data Model: Atomic Hierarchy

Anchor treats all data as a hierarchy of meaning:

### Compound → Molecule → Atom

```
Compound (File)
  id: "auth.ts"
  path: "@inbox/myapp/auth.ts"
  molecules: ["mol_1", "mol_2", ...]
  
  Molecule (Semantic Chunk)
    id: "mol_1"
    content: "The login function validates credentials..."
    start_byte: 15420    ← Pointer into mirrored_brain file
    end_byte: 15890
    atoms: ["atom_auth", "atom_login", "atom_validation"]
    
    Atom (Concept/Entity)
      id: "atom_auth"
      label: "#authentication"
      type: "concept"
```

**Key Insight:** Atoms are **tags/concepts**, not content. Content lives in `mirrored_brain/`, referenced by byte-offsets.

### SimHash Deduplication

Every atom/molecule gets a 64-bit SimHash fingerprint:
- Identical content → identical hash
- Similar content → small Hamming distance
- Used to reject duplicates during ingestion

### Future: AST Pointers for Code

For code files, the architecture supports adding AST pointers:

```typescript
Molecule {
  id: "login-function",
  content: "function login(user: AuthRequest) {...}",
  start_byte: 15420,
  end_byte: 16200,
  ast_path: "Program.body[0].declaration",  // ← Babel/TS path
  code_type: "function",
  dependencies: ["crypto", "db"]
}
```

This enables semantic code search:
- "Find all functions calling `validateToken()`"
- "Show me all Express middleware"
- "Where is the User type defined?"

## Installation

### Prerequisites
- Node.js v18+
- PNPM package manager

### Quick Start
```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Start Engine
pnpm start
```

## Configuration
The engine uses `user_settings.json` in the root directory for configuration (ports, paths, models).

## Standards Implemented
- **Standard 053**: CozoDB Pain Points & OS Compatibility
- **Standard 059**: Reliable Ingestion Pipeline
- **Standard 088**: Server Startup Sequence (ECONNREFUSED fix)
- **Standard 094**: Smart Search Protocol (Fuzzy Fallback & GIN Optimization)
- **Standard 095**: Geometric Deduplication (Range-Based Content Filtering)
- **Standard 096**: Iterative Smart Search Fallback (Multi-stage fallback for complex queries)

## Health Checks
- System status: `GET /health`
- Component status: `GET /health/{component}`
- Performance metrics: `GET /monitoring/metrics`
### Common Issues
- **ECONNREFUSED**: Fixed in Standard 088 - server starts before database initialization
- **Slow Startup**: First run includes database initialization (subsequent runs are faster)
- **UI Access**: Direct access at the configured server URL (default: http://localhost:3160, configurable in user_settings.json) if Electron wrapper is delayed
- **Database Type Errors**: Fixed "Invalid input for string type" errors during ingestion pipeline - see Standard 059 for details

### Health Checks
- System status: `GET /health`
- Component status: `GET /health/{component}`
- Performance metrics: `GET /monitoring/metrics`

## Contributing

We welcome contributions! Please see our contributing guidelines in the documentation.

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** - see the [LICENSE](LICENSE) file for details.

## Support

- Documentation: Check the `/docs/` directory
- Issues: Report bugs and feature requests on GitHub
- Community: Join our discussion forums

## Roadmap

- Enhanced AI reasoning capabilities
- Improved collaboration features
- Mobile application support
- Advanced visualization tools
- Plugin marketplace