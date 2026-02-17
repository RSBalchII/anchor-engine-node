import { runInfectionLoop } from '../src/services/tags/infector.js';
import { db } from '../src/core/db.js';

async function test() {
    console.log("Initializing DB...");
    await db.init();

    console.log("Creating dummy atoms...");
    // Insert test data
    // We intentionally omit 'tags' or provide empty tags
    try {
        await db.run(`
            ?[id, content, tags, type, timestamp, source, internal_monologue, complexity, embedding, last_accessed, access_count, status] <- [
                ['test_1', 'I love TypeScript and CozoDB very much.', [], 'text', 123456, 'manual', '', 1, [], 123, 0, 'active'],
                ['test_2', 'Recursion is dangerous in Node.js, use Generators instead.', [], 'text', 123457, 'manual', '', 1, [], 123, 0, 'active'],
                ['test_3', 'This text has no keywords.', [], 'text', 123458, 'manual', '', 1, [], 123, 0, 'active']
            ]
            :insert memory {id, content, tags, type, timestamp, source, internal_monologue, complexity, embedding, last_accessed, access_count, status}
        `);
    } catch (e: any) {
        console.warn("Insert warning (might already exist):", e.message);
    }

    console.log("Running Infection...");
    await runInfectionLoop();

    console.log("Verifying Results...");

    const res1 = await db.run("?[tags] := *memory{id: 'test_1', tags}");
    console.log("Test 1 (TypeScript, CozoDB):", res1.rows[0]);

    const res2 = await db.run("?[tags] := *memory{id: 'test_2', tags}");
    console.log("Test 2 (Recursion, Generators):", res2.rows[0]);

    const res3 = await db.run("?[tags] := *memory{id: 'test_3', tags}");
    console.log("Test 3 (Empty):", res3.rows[0]);
}

test();
