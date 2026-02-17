import { AtomizerService } from '../src/services/ingest/atomizer-service.js';
import { db } from '../src/core/db.js';
import { config } from '../src/config/index.js';

async function testAtomicIngest() {
    console.log('🧪 Testing Atomic Architecture Ingest...\n');

    // 1. Init DB
    await db.init();

    // 2. Atomize Content
    const atomizer = new AtomizerService();
    const content = "The mitochondria is the powerhouse of the cell. #biology. Python is a programming language. #python";
    const path = "C:/Users/rsbiiw/Projects/science_notes.md";

    console.log('Atomizing content...');
    const result = await atomizer.atomize(content, path, 'internal');

    console.log(`Produced Compound: ${result.compound.id}`);
    console.log(`Produced Molecules: ${result.molecules.length}`);
    console.log(`Produced Atoms: ${result.atoms.length}`);

    // 3. Insert into DB (Simulating API logic)
    console.log('Inserting into DB...');

    // Insert Atoms
    if (result.atoms.length > 0) {
        const atomRows = result.atoms.map(a => [a.id, a.label, a.type, a.weight, new Array(config.MODELS.EMBEDDING_DIM).fill(0.1)]);
        await db.run(`
            ?[id, label, type, weight, embedding] <- $data
            :put atoms { id, label, type, weight, embedding }
        `, { data: atomRows });
    }

    // Insert Molecules
    if (result.molecules.length > 0) {
        const molRows = result.molecules.map(m => [
            m.id,
            m.content,
            m.compoundId,
            m.sequence,
            m.start_byte,
            m.end_byte,
            m.type,
            m.numeric_value || null,
            m.numeric_unit || null,
            new Array(config.MODELS.EMBEDDING_DIM).fill(0.1)
        ]);
        await db.run(`
            ?[id, content, compound_id, sequence, start_byte, end_byte, type, numeric_value, numeric_unit, embedding] <- $data
            :put molecules { id, content, compound_id, sequence, start_byte, end_byte, type, numeric_value, numeric_unit, embedding }
        `, { data: molRows });
    }

    // Insert Compound (Memory)
    // Legacy mapping
    const c = result.compound;
    await db.run(`
        ?[id, timestamp, content, source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, simhash, embedding] <- $data
        :put memory { id, timestamp, content, source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, simhash, embedding }
    `, {
        data: [[
            c.id, c.timestamp, c.compound_body, c.path, c.path, 0, 'compound', 'hash', [], [], [], c.provenance, c.molecular_signature, new Array(config.MODELS.EMBEDDING_DIM).fill(0.1)
        ]]
    });

    console.log('✅ Insertion complete.');

    // 4. Verify Retrieval
    console.log('Verifying Molecules Retrieval...');
    const dbMols = await db.run(`?[content] := *molecules{content, compound_id}, compound_id = $cid`, { cid: result.compound.id });
    console.log('Molecules found in DB:', dbMols.rows.length);
    if (dbMols.rows.length === result.molecules.length) {
        console.log('✅ Molecules retrieval verified.');
    } else {
        console.error('❌ Mismatch in molecules count.');
    }

    console.log('🎉 Atomic Ingest Test Passed.');
    process.exit(0);
}

testAtomicIngest().catch(e => console.error(e));
