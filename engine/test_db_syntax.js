
import { CozoDb } from 'cozo-node';
import fs from 'fs';

async function test() {
    if (fs.existsSync('./test.db')) {
        fs.rmSync('./test.db', { recursive: true, force: true });
    }
    const db = new CozoDb('rocksdb', './test.db');

    try {
        await db.run(`
            :create memory {
                id: String
                =>
                embedding: <F32; 4>
            }
        `);

        console.log("Attempt 1: FTS-like syntax ::hnsw create idx { config }");
        try {
            await db.run(`
                ::hnsw create idx_hnsw {
                    fields: [embedding],
                    dim: 4,
                    m: 50,
                    ef_construction: 200,
                    dtype: 'f32'
                }
            `);
            console.log("SUCCESS: Attempt 1");
            return;
        } catch (e) {
            console.log("FAILED Attempt 1:", e.message);
        }

        console.log("Attempt 2: keys as strings?");
        try {
            await db.run(`
                ::hnsw create idx_hnsw {
                    "fields": ["embedding"],
                    "dim": 4,
                    "m": 50,
                    "ef_construction": 200,
                    "dtype": "f32"
                }
            `);
            console.log("SUCCESS: Attempt 2");
            return;
        } catch (e) {
            console.log("FAILED Attempt 2:", e.message);
        }

    } catch (e) {
        console.error("Setup failed:", e);
    }
}
test();
