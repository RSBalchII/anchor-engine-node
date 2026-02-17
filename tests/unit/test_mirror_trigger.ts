
import { createMirror } from '../src/services/mirror/mirror.js';
import { db } from '../src/core/db.js';

async function testMirror() {
    console.log("Initializing DB...");
    await db.init();

    console.log("Triggering Mirror 2.0...");
    await createMirror();
    console.log("Mirroring complete.");
}

testMirror().catch(console.error);
