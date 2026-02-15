
import { db } from '../src/core/db.js';

async function testAggr() {
    await db.init();

    // Variant 4: :group syntax
    try {
        console.log('Testing Variant 4: :group tag, count() -> tag_count');
        const q4 = '?[tag, tag_count] := *memory{tags}, tag in tags, :group tag, count() -> tag_count :sort -tag_count :limit 5';
        const r4 = await db.run(q4);
        console.log('Result 4:', r4.rows);
    } catch (e) {
        console.error('Variant 4 Failed:', e);
    }

    process.exit(0);
}

testAggr();
