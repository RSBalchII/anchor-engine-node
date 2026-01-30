
import { db } from './engine/src/core/db.js';
import { AtomicIngestService } from './engine/src/services/ingest/ingest-atomic.js';
import { Atom, Molecule, Compound } from './engine/src/types/atomic.js';

// Mock Config if needed, but db.ts loads it.

async function runTest() {
    console.log("--- Simulating Atomic Ingestion ---");

    // Warning: This connects to REAL DB if path is set.
    // We should be careful. 
    // In test environment, usually it uses a distinct file or in-memory if override.

    await db.init();

    const ingest = new AtomicIngestService();

    const atom1: Atom = { id: 'atom_test1', label: 'Test Label', type: 'concept', weight: 1.0 };
    const atom2: Atom = { id: 'atom_test2', label: 'Dupe Label', type: 'concept', weight: 0.5 };

    // compound
    const compound: Compound = {
        id: 'mem_test_compound',
        compound_body: 'Test Body',
        atoms: [atom1.id, atom2.id],
        molecules: [],
        path: 'c:/test/path',
        provenance: 'internal',
        timestamp: Date.now(),
        molecular_signature: "abc"
    };

    try {
        await ingest.ingestResult(compound, [], [atom1, atom2]);
        console.log("✅ Ingestion success");
    } catch (e) {
        console.error("❌ Ingestion top-level error:", e);
    }
}

runTest().then(() => {
    // Keep alive briefly for async logs?
    setTimeout(() => process.exit(0), 1000);
});
