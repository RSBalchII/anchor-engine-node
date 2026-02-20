
import { db } from '../src/core/db.js';
import { executeDistributedRadialSearch, executeSemanticSearch } from '../src/services/semantic/semantic-search.js';

// Test tracking
let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
    try {
        process.stdout.write(`  ${name}... `);
        await fn();
        console.log('✅ PASS');
        passed++;
    } catch (e: any) {
        console.log('❌ FAIL');
        console.error(`     └─ ${e.message}`);
        failed++;
    }
}

function assert(condition: boolean, message?: string) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

async function runFilteringTests() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     SEARCH FILTERING REPRO TESTS       ║');
    console.log('╚════════════════════════════════════════╝\n');

    try {
        await db.init();
        console.log('✅ Database initialized successfully\n');
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        process.exit(1);
    }

    // SECTION 1: Setup Test Data
    console.log('─── Setup Test Data ───');

    // Clean up previous test data if any
    await db.run("DELETE FROM atoms WHERE id LIKE 'test-filter-%'");
    await db.run("DELETE FROM molecules WHERE compound_id LIKE 'test-filter-%'");

    const timestamp = Date.now();

    // 1. Technical/Code Atom
    const codeId = 'test-filter-code-1';
    await db.run(`
        INSERT INTO atoms (id, content, source_path, timestamp, buckets, tags, provenance, compound_id, start_byte, end_byte)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 100)
    `, [
        codeId,
        "function calculateMetrics() { console.log('This is technical code data that should be hidden'); }",
        "file:///src/utils/metrics.ts",
        timestamp,
        ["code", "technical"], // Buckets
        ["#code", "#typescript"], // Tags
        "internal", // Provenance
        codeId
    ]);

    // 2. Personal Atom
    const personalId = 'test-filter-personal-1';
    await db.run(`
        INSERT INTO atoms (id, content, source_path, timestamp, buckets, tags, provenance, compound_id, start_byte, end_byte)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 100)
    `, [
        personalId,
        "I felt really happy today when I went to the park. This is personal journal entry data.",
        "file:///journal/2026-02-11.md",
        timestamp,
        ["personal", "journal"], // Buckets
        ["#journal", "#emotions"], // Tags
        "internal", // Provenance
        personalId
    ]);

    // 3. Populate Molecules (Needed for Radial Search)
    await db.run(`INSERT INTO molecules (id, compound_id, content, start_byte, end_byte) VALUES ($1, $1, $2, 0, 100)`, [codeId, "function calculateMetrics code data"]);
    await db.run(`INSERT INTO molecules (id, compound_id, content, start_byte, end_byte) VALUES ($1, $1, $2, 0, 100)`, [personalId, "I felt really happy today personal data"]);

    // Force FTS Update (Simulating)
    // Cozo/PGlite might need refresh or index update, but usually instant for small inserts.


    // SECTION 2: Run Tests
    console.log('\n─── Verifying Filters ───');

    await test('Standard Semantic Search respects Buckets (Control)', async () => {
        // Search for "data" which matches both
        const result = await executeSemanticSearch("data", ["personal"], 1000, 'all');

        const hasPersonal = result.results.some(r => r.id === personalId);
        const hasCode = result.results.some(r => r.id === codeId);

        if (hasCode) throw new Error("Found Code data despite ['personal'] bucket filter!");
        if (!hasPersonal) throw new Error("Did not find Personal data!");
    });

    await test('Radial Search respects Buckets (Repro)', async () => {
        // @ts-ignore - We expect this to fail type check or runtime if param is missing
        const result = await executeDistributedRadialSearch("data", ["personal"], 1000, 'all', 1.0);

        // Wait, current signature doesn't even HAVE buckets. 
        // If I pass it, it ignores it.
        // But the API *might* be calling it without buckets.

        const hasCode = result.results.some(r => r.id === codeId);

        if (hasCode) {
            // If we successfully found the code, it means we found it... but we WANT to verify if we can filter it.
            // Since the function doesn't accept buckets, this test is creating the PROOF that the feature is missing.
            throw new Error("Radial Search found Code data because it lacks Bucket filtering!");
        }
    });

    console.log('\nCleanup...');
    await db.run("DELETE FROM atoms WHERE id LIKE 'test-filter-%'");
    await db.run("DELETE FROM molecules WHERE compound_id LIKE 'test-filter-%'");
}

runFilteringTests().catch(e => {
    console.error('Test crashed:', e);
    process.exit(1);
});
