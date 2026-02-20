
import { AtomizerService } from '../src/services/ingest/atomizer-service.js';
import * as assert from 'assert';

async function testAtomizerLogic() {
    console.log('🧪 Testing Atomizer Service Logic (Unit)...\n');

    const atomizer = new AtomizerService();

    // --- TEST 1: SANITIZATION (The Key Assassin) ---
    console.log('Test 1: Sanitization (JSON & Log Removal)');
    const dirtyContent = `
    "response_content": "This is legitimate content."
    "thinking_content": "I am thinking about..."
    [2024-01-01] Processing file...
    Actual line of code.
    `;
    // We intentionally invoke the private sanitize method via the public atomize flow
    // or we can test the output of atomize which should be clean.
    const res1 = await atomizer.atomize(dirtyContent, 'test.ts', 'internal');

    // The compound body should be cleaned
    const cleanBody = res1.compound.compound_body;
    console.log(`[Cleaned Body]:\n---\n${cleanBody}\n---`);

    if (!cleanBody.includes('"response_content"')) {
        console.log('✅ JSON wrapper removed.');
    } else {
        console.error('❌ JSON wrapper FAILED to remove.');
    }

    if (!cleanBody.includes('Processing file...')) {
        console.log('✅ Log spam removed.');
    } else {
        console.error('❌ Log spam FAILED to remove.');
    }

    if (cleanBody.includes('Actual line of code')) {
        console.log('✅ Actual content preserved.');
    } else {
        console.error('❌ Actual content lost.');
    }

    // --- TEST 2: TAGGING ---
    console.log('\nTest 2: Auto-Tagging');
    const path2 = 'C:/Users/rsbiiw/Projects/MyProject/src/utils/helper.ts';
    const content2 = 'Some function using #optimization and #database.';
    const res2 = await atomizer.atomize(content2, path2, 'internal');

    const tags = res2.atoms.filter(a => a.type === 'concept' || a.type === 'system').map(a => a.label);
    console.log('Tags found:', tags);

    assert.ok(tags.includes('#project:MyProject'), 'Should find project tag');
    assert.ok(tags.includes('#src'), 'Should find src folder tag');
    assert.ok(tags.includes('#code'), 'Should find code file type tag');
    assert.ok(tags.includes('#optimization'), 'Should find #optimization');

    // Granularity Check
    console.log('Checking Granularity...');
    const mol1 = res2.molecules[0]; // "Some function using #optimization and #database."
    // In my logic, this molecule should have #optimization and #database
    // AND it should have system tags (inherited).
    // Let's verify it has at least the concept tags.
    // We need to look up the labels from the IDs.
    const allAtomsMap = new Map();
    res2.atoms.forEach(a => allAtomsMap.set(a.id, a.label));

    const mol1Tags = mol1.atoms.map(id => allAtomsMap.get(id));
    console.log('Molecule 1 Tags:', mol1Tags);
    assert.ok(mol1Tags.includes('#optimization'), 'Molecule should have #optimization');

    // --- TEST 3: MOLECULAR FISSION ---
    console.log('\nTest 3: Molecular Fission (Sentence Splitting)');
    const content3 = "This is the first sentence. This is the second! Is this the third? Yes.";
    const res3 = await atomizer.atomize(content3, 'test.md', 'internal');

    const mols = res3.molecules.map(m => m.content);
    console.log('Molecules:', mols);

    if (mols.length >= 3) {
        console.log('✅ Sentences split correctly.');
    } else {
        console.error('❌ Sentence splitting failed.');
    }

    // --- TEST 4: SIMHASH ---
    console.log('\nTest 4: Molecular Signature (SimHash)');
    const hash = res3.compound.molecular_signature;
    console.log('SimHash:', hash);
    if (hash && hash !== '0') {
        console.log('✅ SimHash generated.');
    } else {
        console.warn('⚠️ SimHash is 0 (Native module might be missing or empty content).');
    }

    console.log('\n🎉 Atomizer Logic Tests Completed.');
}

testAtomizerLogic().catch(console.error);
