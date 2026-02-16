
import { describe, it, beforeAll, expect } from 'vitest'; // Assuming vitest or similar, but for now just a standalone runnable or integrated if they use a runner.
// actually the existing tests seem to be standalone .ts files or using a custom runner 'suite.js'.
// Let's stick to the pattern of other tests in the dir.

import { db } from '../../src/core/db.js';
import { PhysicsTagWalker } from '../../src/services/search/physics-tag-walker.js';
import { SearchResult } from '../../src/services/search/search.js';

const walker = new PhysicsTagWalker();

async function runBenchmark() {
    console.log("Initializing DB for Benchmark...");
    await db.init();

    // Find a valid anchor
    const anchorRes = await db.run(`
        SELECT a.* 
        FROM atoms a
        JOIN tags t ON a.id = t.atom_id
        GROUP BY a.id, a.content, a.timestamp, a.source_path, a.provenance, a.type, a.compound_id, a.start_byte, a.end_byte, a.embedding, a.vector_id, a.created_at, a.buckets, a.tags, a.epochs, a.sequence, a.hash, a.molecular_signature, a.numeric_value, a.numeric_unit, a.source_id, a.payload
        HAVING count(t.tag) > 0
        LIMIT 1
    `);

    if (!anchorRes.rows || anchorRes.rows.length === 0) {
        console.warn("Skipping benchmark: No tagged atoms found.");
        return;
    }

    const anchor = anchorRes.rows[0];
    const mockResult: SearchResult = {
        id: anchor.id,
        content: anchor.content,
        timestamp: anchor.timestamp,
        tags: [],
        molecular_signature: anchor.simhash || '0',
        frequency: 1,
        provenance: 'internal',
        score: 1.0,
        type: 'thought',
        buckets: [],
        epochs: '',
        temporal_state: {
            first_seen: anchor.timestamp,
            last_seen: anchor.timestamp,
            occurrence_count: 1,
            timestamps: [anchor.timestamp]
        }
    };

    console.log(`Using Anchor: ${anchor.id}`);

    // Warmup
    await walker.applyPhysicsWeighting([mockResult], 0.0);

    const trials = 10;
    let totalTime = 0;

    for (let i = 0; i < trials; i++) {
        const start = performance.now();
        await walker.applyPhysicsWeighting([mockResult], 0.0, {
            walk_radius: 1,
            max_per_hop: 50,
            temperature: 0.2,
            gravity_threshold: 0.001
        });
        totalTime += (performance.now() - start);
    }

    const avg = totalTime / trials;
    console.log(`Average Physics Walk Time: ${avg.toFixed(2)}ms`); // Expected < 20ms
}

if (import.meta.url === `file://${process.argv[1]}`) {
    runBenchmark().catch(console.error);
}

export { runBenchmark };
