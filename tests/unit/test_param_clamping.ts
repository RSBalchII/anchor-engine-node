
import { db } from '../dist/core/db.js';
import { PGlite } from "@electric-sql/pglite";

async function runStabilityTest() {
    console.log("🧪 Starting PGlite Stability Test (Param Clamping)...");

    try {
        await db.init();
        console.log("✅ DB Initialized");

        // 1. Seed Dummy Data (if empty)
        const countRes = await db.run("SELECT count(*) as c FROM atoms");
        const count = Number(countRes.rows[0][0]);
        console.log(`ℹ️ Current Atom Count: ${count}`);

        if (count < 10) {
            console.log("🌱 Seeding dummy data for test...");
            for (let i = 0; i < 50; i++) {
                await db.run(
                    `INSERT INTO atoms (id, content, buckets, tags, timestamp) VALUES ($1, $2, $3, $4, $5)`,
                    [`test_${i}`, `This is a test content string for atom ${i}. It has some length to it.`, ['inbox', 'test'], ['#tag_a', '#tag_b'], Date.now()]
                );
            }
        }

        // 2. Test Buckets Query (Node-side Unnest)
        console.log("🧪 Testing Buckets Query (LIMIT 5000)...");
        const bucketRes = await db.run('SELECT buckets FROM atoms WHERE buckets IS NOT NULL LIMIT 5000');
        const allBuckets = new Set<string>();
        if (bucketRes.rows) {
            for (const row of bucketRes.rows) {
                const bucketArr = row[0];
                if (Array.isArray(bucketArr)) {
                    bucketArr.forEach((b: string) => allBuckets.add(b));
                } else if (typeof bucketArr === 'string') {
                    allBuckets.add(bucketArr);
                }
            }
        }
        console.log(`✅ Buckets Retrieved: ${[...allBuckets].join(', ')}`);

        // 3. Test Mirror Pagination
        console.log("🧪 Testing Mirror Pagination Logic...");
        const BATCH_SIZE = 10; // Small batch for test
        let offset = 0;
        let hasMore = true;
        let totalFetched = 0;

        while (hasMore) {
            // console.log(`   Fetching offset ${offset}...`);
            const query = `SELECT id FROM atoms LIMIT ${BATCH_SIZE} OFFSET ${offset}`;
            const result = await db.run(query);

            if (!result.rows || result.rows.length === 0) {
                hasMore = false;
                break;
            }
            totalFetched += result.rows.length;
            offset += BATCH_SIZE;
            if (offset > 100) break; // Cap for test
        }
        console.log(`✅ Mirror Logic Fetched ${totalFetched} rows in batches.`);

        // 4. Test Semantic Search Substring Safety
        console.log("🧪 Testing Semantic Search Substring Safety...");
        // This query killed it before: to_tsvector on full content
        // New: safely clamped
        const searchRes = await db.run(`
            SELECT id FROM atoms 
            WHERE to_tsvector('simple', substring(content from 1 for 1000)) @@ to_tsquery('simple', 'test')
            LIMIT 5
        `);
        console.log(`✅ Search Returned ${searchRes.rows.length} results.`);

        console.log("🎉 All Stability Tests Passed!");
        process.exit(0);

    } catch (e: any) {
        console.error("❌ Test Failed:", e);
        process.exit(1);
    }
}

runStabilityTest();
