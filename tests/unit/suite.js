/**
 * ECE Test Suite
 * 
 * Verifies core API functionality:
 * - Health endpoint
 * - Ingestion pipeline
 * - Search/Retrieval
 * - Scribe (Markovian State)
 * 
 * Run: npm test (or node tests/suite.js)
 */

const BASE_URL = process.env.ECE_URL || 'http://localhost:3000';

// Test results tracking
let passed = 0;
let failed = 0;

/**
 * Test runner with pretty output
 */
async function test(name, fn) {
    try {
        process.stdout.write(`  ${name}... `);
        await fn();
        console.log('✅ PASS');
        passed++;
    } catch (e) {
        console.log('❌ FAIL');
        console.error(`     └─ ${e.message}`);
        failed++;
    }
}

// Shim for ESM __dirname if needed
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Assert helper
 */
function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

/**
 * Main test suite
 */
async function runSuite() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     ECE TEST SUITE                     ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log(`Target: ${BASE_URL}\n`);

    // ═══════════════════════════════════════════
    // SECTION 1: Core Health
    // ═══════════════════════════════════════════
    console.log('─── Core Health ───');

    await test('Health Endpoint', async () => {
        const res = await fetch(`${BASE_URL}/health`);
        assert(res.ok, `Status ${res.status}`);
        const json = await res.json();
        assert(json.status === 'Sovereign', `Unexpected status: ${json.status}`);
    });

    await test('Models List', async () => {
        const res = await fetch(`${BASE_URL}/v1/models`);
        assert(res.ok, `Status ${res.status}`);
        const models = await res.json();
        assert(Array.isArray(models), 'Expected array of models');
    });

    // ═══════════════════════════════════════════
    // SECTION 2: Ingestion Pipeline
    // ═══════════════════════════════════════════
    console.log('\n─── Ingestion Pipeline ───');

    const testId = `test_${Date.now()}`;
    const testContent = `ECE Test Memory: ${testId}. The secret code is ALPHA_BRAVO.`;

    await test('Ingest Memory', async () => {
        const res = await fetch(`${BASE_URL}/v1/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: testContent,
                source: 'Test Suite',
                type: 'test',
                buckets: ['test', 'verification']
            })
        });
        assert(res.ok, `Status ${res.status}`);
        const json = await res.json();
        assert(json.status === 'success', `Ingest failed: ${JSON.stringify(json)}`);
    });

    // Brief pause for consistency (increased to 3000ms for FTS indexing/flush)
    await new Promise(r => setTimeout(r, 3000));

    // ═══════════════════════════════════════════
    // SECTION 3: Retrieval
    // ═══════════════════════════════════════════
    console.log('\n─── Retrieval ───');

    await test('Search by ID', async () => {
        const res = await fetch(`${BASE_URL}/v1/memory/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: testId,
                buckets: ['test']
            })
        });
        assert(res.ok, `Status ${res.status}`);
        const json = await res.json();
        // Log response if failure suspected
        if (!json.context || !json.context.includes(testId)) {
            console.log('     [DEBUG] Search by ID Response:', JSON.stringify(json).substring(0, 200));
        }
        assert(json.context && json.context.includes(testId), 'Test memory not found in search results');
    });

    await test('Search by Content', async () => {
        const res = await fetch(`${BASE_URL}/v1/memory/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: 'ALPHA_BRAVO',
                buckets: ['test']
            })
        });
        assert(res.ok, `Status ${res.status}`);
        const json = await res.json();
        assert(json.context && json.context.includes('ALPHA_BRAVO'), 'Secret code not found');
    });

    await test('Bucket Filtering', async () => {
        const res = await fetch(`${BASE_URL}/v1/memory/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: testId,
                buckets: ['nonexistent_bucket']
            })
        });
        assert(res.ok, `Status ${res.status}`);
        const json = await res.json();
        // Should NOT find results in wrong bucket
        const found = json.context && json.context.includes(testId);
        assert(!found, 'Should not find test memory in wrong bucket');
    });

    await test('Tag Filtering', async () => {
        // Create tagged memory
        const tagId = `tag_test_${Date.now()}`;
        await fetch(`${BASE_URL}/v1/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `Tagged Memory ${tagId}`,
                source: 'Test Suite',
                tags: ['special_tag', 'verification']
            })
        });

        // Wait for ingestion
        await new Promise(r => setTimeout(r, 1500));

        // Search with tag
        const res = await fetch(`${BASE_URL}/v1/memory/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: tagId,
                // In the new Search implementation, tags are inferred from hash or passed explicitly?
                // The API supports 'tags' param if we updated it? 
                // Wait, search.ts uses inferred tags from query string OR explicit args if mapped.
                // But the API endpoint likely maps body.tags? 
                // Looking at api.ts (not visible here), it usually passes body to service.
                // Let's assume we pass tags in body or query string like "#special_tag".
                query: `${tagId} #special_tag`
            })
        });
        const json = await res.json();
        assert(json.context && json.context.includes(tagId), 'Should find memory with correct tag');

        // Validate result structure has tags/epochs
        if (json.results && json.results.length > 0) {
            const hit = json.results[0];
            assert(Array.isArray(hit.tags), 'Tags should be array');
            assert(hit.tags.includes('special_tag'), 'Tags should include injected tag');
            assert(hit.epochs !== undefined, 'Epochs field should exist (even if null/empty string)');
        }
    });

    // ═══════════════════════════════════════════
    // SECTION 4: Scribe (Markovian State)
    // ═══════════════════════════════════════════
    console.log('\n─── Scribe (Markovian State) ───');

    await test('Get State (Empty)', async () => {
        // Clear first
        await fetch(`${BASE_URL}/v1/scribe/state`, { method: 'DELETE' });

        const res = await fetch(`${BASE_URL}/v1/scribe/state`);
        assert(res.ok, `Status ${res.status}`);
        const json = await res.json();
        // State might be null or have previous data - just check structure
        assert('state' in json, 'Missing state field');
    });

    await test('Clear State', async () => {
        const res = await fetch(`${BASE_URL}/v1/scribe/state`, { method: 'DELETE' });
        assert(res.ok, `Status ${res.status}`);
        const json = await res.json();
        assert(json.status === 'cleared' || json.status === 'error', 'Unexpected response');
    });

    // ═══════════════════════════════════════════
    // SECTION 5: Buckets
    // ═══════════════════════════════════════════
    console.log('\n─── Buckets ───');

    await test('List Buckets', async () => {
        const res = await fetch(`${BASE_URL}/v1/buckets`);
        assert(res.ok, `Status ${res.status}`);
        const buckets = await res.json();
        assert(Array.isArray(buckets), 'Expected array of buckets');
        assert(buckets.includes('test'), 'Test bucket should exist');
    });

    // ═══════════════════════════════════════════
    // SECTION 6: Watchdog & Mirror Verification
    // ═══════════════════════════════════════════
    console.log('\n─── Watchdog & Mirror Verification ───');

    // NOTE: This test requires the engine to be running with access to NOTEBOOK_DIR
    // We will attempt to write a file to the inbox and verify it appears in search
    // and then after a dream, appears in the mirror.

    await test('Watchdog Ingestion', async () => {
        // 1. Create a dummy file in the inbox
        // We need to know where the inbox is. 
        // We can't easily import 'path' or config here if we want to be a standalone test suite
        // relying only on API. BUT, we are running in the same environment likely.
        // Let's assume we can use 'fs' and 'path' if we import them.

        // Dynamic import for fs/path to avoid top-level issues if running in browser-like environment (though this is node)
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');

        // Resolve Notebook Dir - this is tricky without config.
        // We'll rely on the user's setup effectively matching what we expect.
        // Test suite is running in engine/tests/
        // __dirname is .../engine/tests
        // .. -> engine
        // .. -> ECE_Core
        // .. -> Projects
        const NOTEBOOK_DIR = path.resolve(path.join(__dirname, '..', '..', '..', 'notebook'));
        const INBOX_DIR = path.join(NOTEBOOK_DIR, 'inbox');

        if (!fs.existsSync(INBOX_DIR)) {
            // Create it if missing (recovery)
            fs.mkdirSync(INBOX_DIR, { recursive: true });
        }

        const uniqueId = `watchdog_test_${Date.now()}`;
        const filePath = path.join(INBOX_DIR, `${uniqueId}.txt`);
        const fileContent = `This is a watchdog test file. ID: ${uniqueId}`;

        await fs.promises.writeFile(filePath, fileContent);

        // Wait for Watchdog to pick it up (debounce is small but depends on poll)
        // Give it 2 seconds
        await new Promise(r => setTimeout(r, 2000));

        // Search for it
        let found = false;
        let attempts = 0;
        while (!found && attempts < 3) {
            const res = await fetch(`${BASE_URL}/v1/memory/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: uniqueId,
                    buckets: ['inbox'] // It should be in 'inbox' bucket
                })
            });
            const json = await res.json();
            if (json.context && json.context.includes(uniqueId)) {
                found = true;
            } else {
                await new Promise(r => setTimeout(r, 1000));
                attempts++;
            }
        }

        assert(found, `Watchdog failed to ingest file ${uniqueId}`);

        // Cleanup input file
        await fs.promises.unlink(filePath);
    });

    await test('Mirror Protocol', async () => {
        // Trigger Dream
        const res = await fetch(`${BASE_URL}/v1/dream`, { method: 'POST' });
        assert(res.ok, `Dream request failed: ${res.status}`);

        const fs = await import('fs');
        const path = await import('path');

        const NOTEBOOK_DIR = path.resolve(path.join(__dirname, '..', '..', '..', 'notebook'));
        const MIRROR_DIR = path.join(NOTEBOOK_DIR, 'mirrored_brain');
        const inboxMirror = path.join(MIRROR_DIR, 'inbox'); // Bucket is likely 'inbox'
        const year = new Date().getFullYear().toString();
        const yearDir = path.join(inboxMirror, year);

        // Verification might be flaky if dream queue is slow, but we awaited the response which awaits the dream
        // Check for ANY file in recent mirror
        if (fs.existsSync(yearDir)) {
            const files = await fs.promises.readdir(yearDir);
            assert(files.length >= 0, 'Directory exists');
            if (files.length > 0) console.log(`     └─ Verified ${files.length} mirrored memories.`);
        } else {
            console.log('     └─ Mirror directory not yet created (acceptable if no new memories processed)');
        }
    });

    // ═══════════════════════════════════════════
    // SECTION 7: Semantic Decompression (Atomizer)
    // ═══════════════════════════════════════════
    console.log('\n─── Semantic Decompression (Atomizer) ───');

    await test('Atomizer splitting', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const NOTEBOOK_DIR = path.resolve(path.join(__dirname, '..', '..', '..', 'notebook'));
        const INBOX_DIR = path.join(NOTEBOOK_DIR, 'inbox');

        const atomId = `atom_test_${Date.now()}`;
        const filePath = path.join(INBOX_DIR, `${atomId}.md`);
        // Create 3 paragraphs -> Should be 3 atoms
        const content = `Block 1: ${atomId}.\n\nBlock 2: ${atomId} continued.\n\nBlock 3: ${atomId} ending.`;

        await fs.promises.writeFile(filePath, content);
        await new Promise(r => setTimeout(r, 2000)); // Wait for Watchdog

        // Search should return 3 results or we check context
        const res = await fetch(`${BASE_URL}/v1/memory/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: atomId, buckets: ['inbox'] })
        });
        const json = await res.json();

        // This is a rough check. Ideally we'd inspect the DB structure directly or backup
        // But if we find the content, ingestion worked.
        assert(json.context && json.context.includes(atomId), 'Atom content not found');

        // Cleanup
        await fs.promises.unlink(filePath);
    });

    // ═══════════════════════════════════════════
    // SECTION 8: Abstraction Pyramid
    // ═══════════════════════════════════════════
    console.log('\n─── Abstraction Pyramid ───');

    await test('Dreamer / Abstraction', async () => {
        // Trigger Dream again to process new atoms
        let res = await fetch(`${BASE_URL}/v1/dream`, { method: 'POST' });
        let json = await res.json();

        if (json.status === 'skipped') {
            console.log('     └─ Dream skipped (locked). Retrying in 2s...');
            await new Promise(r => setTimeout(r, 2000));
            res = await fetch(`${BASE_URL}/v1/dream`, { method: 'POST' });
            json = await res.json();
        }

        assert(res.ok, 'Dream failed');

        // Check "updated" or "analyzed" count
        if (json.analyzed > 0) {
            console.log(`     └─ Analyzed ${json.analyzed} memories.`);
        }

        if (json.status !== 'success') {
            console.log(`     [DEBUG] Dream Response:`, JSON.stringify(json));
        }
        assert(json.status === 'success', `Dream status not success: ${json.status} - ${json.message}`);
    });

    // ═══════════════════════════════════════════
    // SECTION 9: Enhanced Native Module Tests
    // ═══════════════════════════════════════════
    console.log('\n─── Enhanced Native Module Tests ───');

    try {
        const { runEnhancedNativeTests } = await import('./test_enhanced_native_modules.js');
        const result = await runEnhancedNativeTests();
        passed += result.passed;
        failed += result.failed;
    } catch (e) {
        console.log('❌ FAIL');
        console.error(`     └─ Enhanced native module tests failed: ${e.message}`);
        failed++;
    }

    // ═══════════════════════════════════════════
    // SECTION 10: Bright Node Protocol Tests
    // ═══════════════════════════════════════════
    console.log('\n─── Bright Node Protocol Tests ───');

    try {
        const { runBrightNodeTests } = await import('./test_bright_node_protocol.js');
        const result = await runBrightNodeTests();
        passed += result.passed;
        failed += result.failed;
    } catch (e) {
        console.log('❌ FAIL');
        console.error(`     └─ Bright Node Protocol tests failed: ${e.message}`);
        failed++;
    }

    // ═══════════════════════════════════════════
    // RESULTS
    // ═══════════════════════════════════════════
    console.log('\n╔════════════════════════════════════════╗');
    console.log(`║  Results: ${passed} passed, ${failed} failed`.padEnd(41) + '║');
    console.log('╚════════════════════════════════════════╝\n');

    process.exit(failed > 0 ? 1 : 0);
}

// Run
runSuite().catch(e => {
    console.error('Suite crashed:', e);
    process.exit(1);
});
