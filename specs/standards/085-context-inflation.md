# Standard 085: Context Inflation Protocol (Semantic Window Assembly)

**Status:** Active | **Domain:** Retrieval & Presentation | **Category:** Context Assembly

## Core Problem
The system retrieves semantic molecules individually, but users need coherent windows of context that maintain narrative flow and semantic continuity. Separate molecules need to be intelligently assembled into meaningful windows.

## The Challenge
When the Tag-Walker retrieves individual semantic molecules, they may be fragments of larger semantic units. Presenting them as separate fragments can break narrative flow and reduce comprehension. The system needs to intelligently inflate separate molecules into coherent windows.

## The Solution: Context Inflation Protocol

### 1. Semantic Window Assembly
The system implements "Context Inflation" to combine separate semantic molecules into coherent windows:
- Adjacent molecules from same source are combined
- Temporal proximity molecules are grouped
- Semantic similarity molecules are clustered
- Narrative flow is preserved across molecule boundaries

### 2. Inflation Strategies
Different strategies for different content types:

#### Prose Inflation
- Combine adjacent sentences/paragraphs from same document
- Preserve narrative flow and story continuity
- Maintain character/subject consistency

#### Code Inflation
- Combine adjacent code blocks from same file
- Preserve function/class context
- Maintain variable scope relationships

#### Data Inflation
- Combine related data points from same source
- Preserve temporal relationships
- Maintain categorical consistency

### 3. Byte Coordinate Inflation
When molecules have byte coordinates, the system can intelligently fill gaps:
```
Molecule A: bytes 1000-1200
Molecule B: bytes 1250-1400
Gap: bytes 1201-1249 (likely metadata/comments)
Inflate: Combine A + gap content + B for coherent window
```

### 4. Database Compatibility (PGlite/WASM)
**Constraint**: The `PGlite` WASM engine has strict memory limits and SQL parser quirks.
*   **Rule 1: No Massive Allocations**: Do not fetch `compound_body` > 1MB in a single `SELECT`. Use `length()` checks first.
*   **Rule 2: SUBSTR over SUBSTRING**: Use `substr(col, start, len)` instead of ANSI `substring(col from x for y)` to avoid "invalid escape string" parser crashes.
*   **Rule 3: Chunked Inflation**: If content > MaxSafeSize, fetch in chunks to prevent WASM heap overflow.

## Implementation Requirements

### 1. Inflation Engine
```typescript
interface InflationResult {
  window: string;           // Combined content
  source: string;           // Original source identifier
  start_byte: number;       // Start of window in original
  end_byte: number;         // End of window in original
  molecules: string[];      // Constituent molecules
  inflation_strategy: string; // 'adjacent', 'temporal', 'semantic', etc.
  coherence_score: number;  // 0.0-1.0 confidence in window coherence
}
```

### 2. Context Inflator Class
```typescript
class ContextInflator {
  static inflate(molecules: SearchMolecule[], maxChars: number): InflationResult[]
  private static applyInflationStrategy(molecules: SearchMolecule[], strategy: InflationStrategy): InflationResult[]
  private static calculateCoherence(molecules: SearchMolecule[]): number
  private static fillByteGaps(moleculeA: SearchMolecule, moleculeB: SearchMolecule): string
}
```

### 3. Inflation Strategies
- **Adjacent**: Molecules from same source with contiguous byte ranges
- **Temporal**: Molecules with close timestamps and related content
- **Semantic**: Molecules with high semantic similarity scores
- **Narrative**: Molecules with shared entities and temporal progression

## Performance Targets
- Inflation Speed: <5ms per window assembly
- Coherence Preservation: >90% of semantic relationships maintained
- Character Budget Adherence: <5% over-budget assemblies
- Memory Efficiency: <2x memory overhead during inflation

## Validation Criteria
1. Adjacent molecules from same source must be properly combined
2. Byte-coordinate gaps must be intelligently filled
3. Narrative flow must be preserved across molecule boundaries
4. Character budget limits must be respected
5. Semantic relationships must be maintained during inflation
6. Performance metrics must remain within acceptable ranges

## Compliance Verification
- [ ] Context inflation engine implemented and tested
- [ ] Multiple inflation strategies operational
- [ ] Byte coordinate gap filling working correctly
- [ ] Character budget enforcement validated
- [ ] Narrative flow preservation verified
- [ ] Performance benchmarks met

## 5. Radial Lazy Molecule Inflation (2026-02)
Instead of storing molecules at ingest time, the system supports **on-the-fly molecule creation** from atom positions:

### 5.1 Atom Position Tracking
- During ingest, record `{compound_id, atom_label, byte_offset}` for each detected keyword
- Stored in `atom_positions` table with index on `atom_label`

### 5.2 Dynamic Radius Calculation
Radius scales with token budget to capture complete semantic units:
```
radius = floor(tokenBudget * charsPerToken / expectedResults / 2)

Examples (assuming 4 chars/token, 10 results expected):
- 2,000 tokens  → 400 bytes radius (~80 words each direction)
- 10,000 tokens → 2,000 bytes radius (~400 words)
- 20,000 tokens → 4,000 bytes radius (~800 words)
```

### 5.3 Code Handling
When inflating code content:
- Ignore whitespace in budget calculations (content density matters, not padding)
- Expand to function/block boundaries where possible
- Preserve indentation for readability

### 5.4 Overlap Merge
When multiple atoms in the same compound have overlapping or adjacent radial windows:
1. Sort windows by start position
2. If `window.start <= previous.end`, merge into one extended window
3. Continue radiating outward as unified molecule

```
Atom A: position 1000, radius 500 → window [500, 1500]
Atom B: position 1400, radius 500 → window [900, 1900]
Overlap detected → Merged window [500, 1900]
```

### 5.5 Distributed Budget (70/30)
For multi-term queries, budget is distributed:
- **70%** → Direct query atoms (evenly split)
- **30%** → Related/nearby atoms (5 per primary term via synonym ring)

## Change Capture
This standard was created to implement the Context Inflation Protocol that enables the system to present coherent semantic windows instead of fragmented molecules, improving user comprehension and maintaining narrative continuity in retrieved results. The protocol addresses the gap between granular semantic retrieval and human-readable context presentation.

**2026-02 Update**: Added Radial Lazy Molecule Inflation (Section 5) with dynamic radius based on token budget and 70/30 distributed query budget.