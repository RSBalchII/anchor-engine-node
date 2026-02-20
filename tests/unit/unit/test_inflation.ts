
import { ContextInflator } from './services/search/context-inflator.js';
import { SearchResult } from './services/search/search.js';
import { db } from './core/db.js';

async function testInflation() {
    console.log("Initializing DB...");
    await db.init();
    console.log("DB Initialized.");

    const compoundId = 'test_compound_' + Date.now();
    const body = "The quick brown fox jumps over the lazy dog. ".repeat(20);
    // Length: 45 * 20 = 900 chars

    // Insert dummy compound
    console.log("Inserting dummy compound...");
    await db.run(
        `INSERT INTO compounds (id, compound_body, path, timestamp, provenance, molecular_signature, atoms, molecules, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
            compoundId,
            body,
            'test/path',
            Date.now(),
            'internal',
            'sig',
            [],
            [],
            new Array(384).fill(0.1)
        ]
    );

    // Create 2 fake search results (molecules) that are close
    // "fox" at ~20 and "dog" at ~40
    const res1: SearchResult = {
        id: 'mol1', content: 'fox', source: 'test', timestamp: Date.now(),
        buckets: [], tags: [], epochs: '', provenance: 'internal', score: 10,
        compound_id: compoundId, start_byte: 16, end_byte: 19,
        is_inflated: false
    };

    const res2: SearchResult = {
        id: 'mol2', content: 'dog', source: 'test', timestamp: Date.now(),
        buckets: [], tags: [], epochs: '', provenance: 'internal', score: 10,
        compound_id: compoundId, start_byte: 40, end_byte: 43,
        is_inflated: false
    };

    console.log("Original Results:", [res1, res2]);

    const inflated = await ContextInflator.inflate([res1, res2]);

    console.log("Inflated Results:", inflated);

    if (inflated.length === 1 && inflated[0].content.length > 50) {
        console.log("SUCCESS: Merged and expanded.");
    } else {
        console.error("FAILURE: Did not merge or expand correctly.");
    }

    // Cleanup
    await db.run(`DELETE FROM compounds WHERE id = $1`, [compoundId]);
}

testInflation().catch(console.error);
