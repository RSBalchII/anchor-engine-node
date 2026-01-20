
import { db } from '../src/core/db.js';

async function testHead() {
    await db.init();
    try {
        const q = '?[tag, count()] := *memory{tags}, tag in tags :limit 1';
        const r = await db.run(q);
        console.log('Headers:', r.headers);
        console.log('Rows:', r.rows);
    } catch (e) {
        console.error('Failed:', e);
    }
    process.exit(0);
}

testHead();
