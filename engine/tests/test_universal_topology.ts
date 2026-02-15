
import { AtomizerService } from '../src/services/ingest/atomizer-service.js';
import * as assert from 'assert';

async function testUniversalTopology() {
    console.log('🧪 Testing Universal Topology (Pointer-Based Architecture)...\n');

    const atomizer = new AtomizerService();

    // --- TEST 1: Textual Molecule (Offsets) ---
    console.log('Test 1: Textual Molecules (Offsets & Type)');
    const proseContent = "The quick brown fox jumps. The lazy dog sleeps.";
    const startOfSecond = proseContent.indexOf('The lazy');

    const res1 = await atomizer.atomize(proseContent, 'story.md', 'internal');
    const mols1 = res1.molecules;

    console.log(`Molecules found: ${mols1.length}`);
    const m1 = mols1[1];

    console.log(`[Molecule 2] Content: "${m1.content}"`);
    console.log(`[Molecule 2] Type: ${m1.type}`);
    console.log(`[Molecule 2] Offsets: [${m1.start_byte}, ${m1.end_byte}]`);

    if (m1.type === 'prose' && m1.start_byte === startOfSecond) {
        console.log('✅ Textual offsets and type verified.');
    } else {
        console.error(`❌ Mismatch. Expected start ${startOfSecond}, got ${m1.start_byte}. Type: ${m1.type}`);
    }

    // --- TEST 2: Numerical Molecule (Data Extraction) ---
    console.log('\nTest 2: Numerical Molecules (Data Fork)');
    // Simulating a CSV row or data-heavy string
    const dataContent = "| 2024-01-01 | Well_592 | 1500 PSI |";
    const res2 = await atomizer.atomize(dataContent, 'production.csv', 'internal');

    const mData = res2.molecules[0];
    console.log(`[Data Molecule] Content: "${mData.content}"`);
    console.log(`[Data Molecule] Type: ${mData.type}`);
    console.log(`[Data Molecule] Value: ${mData.numeric_value}`);
    console.log(`[Data Molecule] Unit: ${mData.numeric_unit}`);

    if (mData.type === 'data') {
        console.log('✅ Type detected as DATA.');
    } else {
        console.error(`❌ Failed to detect DATA type. Got: ${mData.type}`);
    }

    if (mData.numeric_value === 1500 && mData.numeric_unit === 'PSI') {
        console.log('✅ Numeric extraction (1500 PSI) verified.');
    } else {
        console.error(`❌ Numeric extraction failed. Got: ${mData.numeric_value} ${mData.numeric_unit}`);
    }

    // --- TEST 3: Code Molecule ---
    console.log('\nTest 3: Code Molecules');
    const codeContent = "const x = 10; function test() { return x; }";
    const res3 = await atomizer.atomize(codeContent, 'script.ts', 'internal');
    const mCode = res3.molecules[0];

    console.log(`[Code Molecule] Type: ${mCode.type}`);
    if (mCode.type === 'code') {
        console.log('✅ Type detected as CODE.');
    } else {
        console.error(`❌ Failed to detect CODE type. Got: ${mCode.type}`);
    }

    console.log('\n🎉 Universal Topology Tests Completed.');
}

testUniversalTopology().catch(console.error);
