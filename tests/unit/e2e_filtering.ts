
import { db } from '../src/core/db.js';
import { executeSemanticSearch } from '../src/services/semantic/semantic-search.js';

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

async function runEndToEndVerification() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     END-TO-END FILTERING TEST          ║');
    console.log('╚════════════════════════════════════════╝\n');

    try {
        await db.init();

        // Clean up previous test data to ensure clean state
        await db.run("DELETE FROM atoms WHERE id LIKE 'test-e2e-%'");
        await db.run("DELETE FROM molecules WHERE compound_id LIKE 'test-e2e-%'");
        await db.run("DELETE FROM compounds WHERE id LIKE 'test-e2e-%'");
        await db.run("DELETE FROM atom_positions WHERE compound_id LIKE 'test-e2e-%'");

        // Use executeSemanticSearch which is the main entry point
        // This verifies filters are passed all the way down to Radial Search
        await test('SemanticSearch (End-to-End) respects Buckets', async () => {
            // 1. Technical/Code Atom
            const codeId = 'test-e2e-code-1';
            const timestamp = Date.now();
            await db.run(`INSERT INTO atoms (id, content, source_path, timestamp, buckets, tags, provenance, compound_id, start_byte, end_byte) VALUES ('${codeId}', 'function sensitiveCode() { secret_key = 123 }', 'file:///src/secret.ts', ${timestamp}, '{"code", "technical"}', '{"#code"}', 'internal', '${codeId}', 0, 100)`);
            await db.run(`INSERT INTO molecules (id, compound_id, content, start_byte, end_byte) VALUES ('${codeId}', '${codeId}', 'function sensitiveCode data', 0, 100)`);
            await db.run(`INSERT INTO compounds (id, path, timestamp, provenance, compound_body) VALUES ('${codeId}', 'file:///src/secret.ts', ${timestamp}, 'internal', 'function sensitiveCode data')`);

            // 2. Personal Atom
            const personalId = 'test-e2e-personal-1';
            await db.run(`INSERT INTO atoms (id, content, source_path, timestamp, buckets, tags, provenance, compound_id, start_byte, end_byte) VALUES ('${personalId}', 'My personal diary entry about sensitive stuff', 'file:///diary.md', ${timestamp}, '{"personal"}', '{"#diary"}', 'internal', '${personalId}', 0, 100)`);
            await db.run(`INSERT INTO molecules (id, compound_id, content, start_byte, end_byte) VALUES ('${personalId}', '${personalId}', 'My personal diary data', 0, 100)`);
            await db.run(`INSERT INTO compounds (id, path, timestamp, provenance, compound_body) VALUES ('${personalId}', 'file:///diary.md', ${timestamp}, 'internal', 'My personal diary data')`);

            // Ensure atom positions exist
            await db.run(`INSERT INTO atom_positions (compound_id, atom_label, byte_offset) VALUES ('${codeId}', 'sensitive', 10)`);
            await db.run(`INSERT INTO atom_positions (compound_id, atom_label, byte_offset) VALUES ('${personalId}', 'diary', 10)`);

            // Test A: Search for "sensitive" with bucket "personal" -> Should find NOTHING (leak check)
            // "sensitive" is in code, but we filter for personal.
            // We search for "sensitive" (matches code) but filter for 'personal' bucket.
            const resultLeak = await executeSemanticSearch("sensitive", ["personal"], 1000, 'all');
            const leaked = resultLeak.results.some(r => r.id === codeId);
            if (leaked) throw new Error("Leaked Code data when searching for 'Personal' bucket!");

            // Test B: Search for "diary" with bucket "personal" -> Should find IT
            const resultValid = await executeSemanticSearch("diary", ["personal"], 1000, 'all');
            const found = resultValid.results.some(r => r.id === personalId);
            if (!found) throw new Error("Failed to find Personal data with correct bucket!");

            // Cleanup
            await db.run("DELETE FROM atoms WHERE id LIKE 'test-e2e-%'");
            await db.run("DELETE FROM molecules WHERE compound_id LIKE 'test-e2e-%'");
            await db.run("DELETE FROM compounds WHERE id LIKE 'test-e2e-%'");
            await db.run("DELETE FROM atom_positions WHERE compound_id LIKE 'test-e2e-%'");
        });

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

runEndToEndVerification();
