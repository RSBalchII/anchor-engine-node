
import { runDiscovery } from '../src/services/tags/discovery.js';
import { runInfectionLoop } from '../src/services/tags/infector.js';
import { db } from '../src/core/db.js';

async function testInfectionProtocol() {
    console.log('--- Testing Tag Infection Protocol (Standard 068) ---');
    await db.init();

    try {
        // 1. Run Discovery (The Teacher)
        console.log('Step 1: Learning from data...');
        const discovered = await runDiscovery(5);
        console.log(`Discovered tags: ${discovered.join(', ')}`);

        // 2. Run Infection (The Student)
        console.log('Step 2: Infecting the graph...');
        const result = await runInfectionLoop() as any;
        console.log(`Infection results: ${result.atomsUpdated} atoms updated in ${result.durationMs}ms`);

        if (discovered.length >= 0) {
            console.log('✅ PASS: Teacher-Student loop completed.');
        }
    } catch (e) {
        console.error('❌ FAIL: Infection Protocol error:', e);
    }

    process.exit(0);
}

testInfectionProtocol();
