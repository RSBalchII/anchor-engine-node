
import { db } from '../src/core/db.js';

async function checkDb() {
    await db.init();
    const result = await db.run("?[count(id)] := *memory{id}");
    console.log("Memory count:", result.rows);
}

checkDb().catch(console.error);
