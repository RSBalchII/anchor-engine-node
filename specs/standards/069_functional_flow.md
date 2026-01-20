# Standard 069: Functional Flow (Generators over Loops)

**Status:** Active
**Context:** Node.js (V8) Stack Limitations vs. Large Datasets (1M+ Atoms).

## 1. The Recursion Ban
**Recursive functions are STRICTLY PROHIBITED** for data processing pipelines (Ingest, Refiner, Search).
*   **Reason:** Node.js lacks Tail Call Optimization (TCO). Recursion depth > 10k triggers `RangeError` and crashes the process.
*   **Exception:** Recursion is permitted ONLY for hierarchical structures with strictly bounded depth < 100 (e.g., Folder walking, JSON parsing, DOM trees).

## 2. The Iterator Pattern
Replace `for` loops with **Async Generators** (`async function*`) when processing datasets.
*   **Memory Efficiency:** Generators process items lazily (one by one), preventing RAM spikes (O(1) memory vs O(n)).
*   **Cleanliness:** Eliminates index variables (`i`, `j`), accumulators, and boundary checks.

## 3. Implementation Guide

**Bad (Loop Bloat):**
```typescript
const batches = [/*...*/];
const results = [];
for (let i = 0; i < batches.length; i++) {
   results.push(await process(batches[i]));
}
```

**Good (Pipeline):**
```typescript
import { pipeline } from 'stream/promises';

await pipeline(
    sourceStream,     // Generator
    transformFunction, // Processor
    writeStream       // Database
);
```

**Sovereign Standard (Manual Consumption):**
```typescript
async function* itemGenerator() {
    // fetch batch...
    for (const item of batch) yield item;
}

for await (const item of itemGenerator()) {
    await process(item);
}
```
