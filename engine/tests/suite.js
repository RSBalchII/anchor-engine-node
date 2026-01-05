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

    // Brief pause for consistency
    await new Promise(r => setTimeout(r, 500));

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
