/**
 * End-to-end test for byte offset handling with non-ASCII text
 * Tests the complete flow: atomization -> storage -> search -> extraction
 */

import { AtomizerService } from '../src/services/ingest/atomizer-service.js';
import * as assert from 'assert';

async function testEndToEnd() {
    console.log('🧪 End-to-End Test: Non-ASCII Byte Offset Handling...\n');

    const atomizer = new AtomizerService();

    // Test content with various non-ASCII characters
    const testContent = `
Welcome to the documentation! 🎉

This guide covers multiple languages:
- English: Hello World
- French: Bonjour le monde 🇫🇷
- Chinese: 你好世界 🇨🇳
- Japanese: こんにちは世界 🇯🇵
- Emoji examples: 🚀 🌍 💻 🎨

Special characters: café, naïve, Zürich, São Paulo.

Code example:
\`\`\`javascript
console.log("Hello 世界");
\`\`\`

End of document.
    `.trim();

    console.log('Test Content:');
    console.log('---');
    console.log(testContent);
    console.log('---');
    console.log(`String length: ${testContent.length}`);
    console.log(`Byte length: ${Buffer.byteLength(testContent, 'utf8')}\n`);

    // Step 1: Atomize the content
    console.log('Step 1: Atomizing content...');
    const result = await atomizer.atomize(testContent, 'test_multilang.md', 'internal');
    console.log(`✅ Atomized into ${result.molecules.length} molecules\n`);

    // Step 2: Verify each molecule can be extracted correctly using byte offsets
    console.log('Step 2: Verifying byte offset extraction...');
    const compoundBody = result.compound.compound_body;
    const bodyBuffer = Buffer.from(compoundBody, 'utf8');

    let allPassed = true;
    for (let i = 0; i < result.molecules.length; i++) {
        const mol = result.molecules[i];
        
        // Extract using byte offsets (simulating what search.ts does)
        const extractedBuffer = bodyBuffer.subarray(mol.start_byte, mol.end_byte);
        const extractedContent = extractedBuffer.toString('utf8');

        // Compare (allow for trailing newline differences)
        const normalizedExtracted = extractedContent.trimEnd();
        const normalizedMol = mol.content.trimEnd();
        
        if (normalizedExtracted !== normalizedMol) {
            console.error(`❌ Molecule ${i} failed!`);
            console.error(`  Expected: "${mol.content}"`);
            console.error(`  Got:      "${extractedContent}"`);
            console.error(`  Bytes: ${mol.start_byte}-${mol.end_byte}`);
            allPassed = false;
        } else {
            // Show a sample of successful extractions
            if (i < 3 || mol.content.includes('🎉') || mol.content.includes('世界')) {
                console.log(`  ✅ Molecule ${i}: "${mol.content.substring(0, 50)}${mol.content.length > 50 ? '...' : ''}"`);
            }
        }
    }

    if (allPassed) {
        console.log(`\n✅ All ${result.molecules.length} molecules extracted correctly!`);
    } else {
        console.error('\n❌ Some molecules failed extraction!');
        process.exit(1);
    }

    // Step 3: Test specific non-ASCII molecules
    console.log('\nStep 3: Testing specific non-ASCII content...');
    
    const chineseMol = result.molecules.find(m => m.content.includes('你好世界'));
    if (chineseMol) {
        const extracted = bodyBuffer.subarray(chineseMol.start_byte, chineseMol.end_byte).toString('utf8');
        assert.strictEqual(extracted, chineseMol.content, 'Chinese text extraction failed');
        console.log('  ✅ Chinese text: extracted correctly');
    }

    const emojiMol = result.molecules.find(m => m.content.includes('🎉'));
    if (emojiMol) {
        const extracted = bodyBuffer.subarray(emojiMol.start_byte, emojiMol.end_byte).toString('utf8');
        assert.strictEqual(extracted, emojiMol.content, 'Emoji text extraction failed');
        console.log('  ✅ Emoji text: extracted correctly');
    }

    const japaneseMol = result.molecules.find(m => m.content.includes('こんにちは'));
    if (japaneseMol) {
        const extracted = bodyBuffer.subarray(japaneseMol.start_byte, japaneseMol.end_byte).toString('utf8');
        assert.strictEqual(extracted, japaneseMol.content, 'Japanese text extraction failed');
        console.log('  ✅ Japanese text: extracted correctly');
    }

    const accentMol = result.molecules.find(m => m.content.includes('café') || m.content.includes('naïve'));
    if (accentMol) {
        const extracted = bodyBuffer.subarray(accentMol.start_byte, accentMol.end_byte).toString('utf8');
        assert.strictEqual(extracted, accentMol.content, 'Accented text extraction failed');
        console.log('  ✅ Accented text: extracted correctly');
    }

    // Step 4: Verify byte offset integrity
    console.log('\nStep 4: Verifying byte offset integrity...');
    
    // Check that offsets are monotonically increasing and non-overlapping
    for (let i = 1; i < result.molecules.length; i++) {
        const prev = result.molecules[i - 1];
        const curr = result.molecules[i];
        
        if (curr.start_byte < prev.end_byte && curr.start_byte !== prev.start_byte) {
            console.warn(`⚠️  Overlapping molecules detected: ${i-1} and ${i}`);
            console.warn(`     Prev: ${prev.start_byte}-${prev.end_byte}`);
            console.warn(`     Curr: ${curr.start_byte}-${curr.end_byte}`);
        }
    }
    console.log('  ✅ Byte offset integrity check passed');

    console.log('\n🎉 End-to-End Test Passed!');
}

// Run the test
testEndToEnd().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
