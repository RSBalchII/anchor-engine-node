
import { db } from './src/core/db.js';

async function checkSchema() {
    await db.init();
    const res = await db.run("SELECT column_name FROM information_schema.columns WHERE table_name = 'compounds'");
    console.log('Compounds Columns:', res.rows.map(r => r[0]));

    const res2 = await db.run("SELECT column_name FROM information_schema.columns WHERE table_name = 'atoms'");
    console.log('Atoms Columns:', res2.rows.map(r => r[0]));
}

checkSchema().catch(console.error);
