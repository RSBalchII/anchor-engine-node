
import { dream } from '../src/services/dreamer/dreamer.js';
import { db } from '../src/core/db.js';

async function testDreamer() {
    console.log('--- Testing Dreamer Performance Optimizations ---');
    await db.init();

    const startTime = Date.now();
    try {
        const result = await dream();
        const duration = (Date.now() - startTime) / 1000;

        console.log('--- Dream Cycle Results ---');
        console.log(`Status: ${result.status}`);
        console.log(`Analyzed: ${result.analyzed}`);
        console.log(`Updated: ${result.updated}`);
        console.log(`Duration: ${duration.toFixed(2)}s`);

        if (result.status === 'success') {
            console.log('✅ PASS: Dream cycle completed successfully.');
        } else {
            console.log(`⚠️ INFO: Dream cycle status: ${result.status}`);
        }
    } catch (e) {
        console.error('❌ FAIL: Dream cycle crashed:', e);
    }

    process.exit(0);
}

testDreamer();
