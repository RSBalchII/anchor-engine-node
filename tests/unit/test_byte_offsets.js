/**
 * Test byte offset calculation for non-ASCII text
 * This test verifies that start_byte and end_byte are true UTF-8 byte offsets,
 * not string indices, which is critical for correct slicing with Buffer.subarray()
 */

import { AtomizerService } from '../src/services/ingest/atomizer-service.js';
import * as assert from 'assert';

async function testByteOffsets() {
    console.log('🧪 Testing Byte Offset Calculation for Non-ASCII Text...\n');

    const atomizer = new AtomizerService();

    // Test Case 1: Emoji (4 bytes in UTF-8, but 2 UTF-16 code units)
    console.log('Test 1: Emoji Characters');
    const emojiContent = "Hello 🌍 World. This is a test 🚀.";
    const res1 = await atomizer.atomize(emojiContent, 'test_emoji.md', 'internal');
    
    console.log(`Content: "${emojiContent}"`);
    console.log(`String length: ${emojiContent.length}`);
    console.log(`Byte length: ${Buffer.byteLength(emojiContent, 'utf8')}`);
    console.log(`Molecules found: ${res1.molecules.length}`);
    
    for (const mol of res1.molecules) {
        console.log(`  Molecule: "${mol.content}"`);
        console.log(`    String indices would be: 0-${mol.content.length}`);
        console.log(`    Byte offsets: ${mol.start_byte}-${mol.end_byte}`);
        
        // Verify: Extract the slice using byte offsets
        const fullBodyBuffer = Buffer.from(res1.compound.compound_body, 'utf8');
        const slicedBuffer = fullBodyBuffer.subarray(mol.start_byte, mol.end_byte);
        const slicedContent = slicedBuffer.toString('utf8');
        
        console.log(`    Extracted via Buffer.subarray: "${slicedContent}"`);
        
        // The extracted content should match the molecule content
        assert.strictEqual(slicedContent, mol.content, 
            `Buffer slice mismatch! Expected "${mol.content}" but got "${slicedContent}"`);
        console.log('    ✅ Byte offset extraction matches!');
    }

    // Test Case 2: Chinese characters (3 bytes each in UTF-8)
    console.log('\nTest 2: Chinese Characters');
    const chineseContent = "你好世界。这是一个测试。";
    const res2 = await atomizer.atomize(chineseContent, 'test_chinese.md', 'internal');
    
    console.log(`Content: "${chineseContent}"`);
    console.log(`String length: ${chineseContent.length}`);
    console.log(`Byte length: ${Buffer.byteLength(chineseContent, 'utf8')}`);
    console.log(`Molecules found: ${res2.molecules.length}`);
    
    for (const mol of res2.molecules) {
        console.log(`  Molecule: "${mol.content}"`);
        console.log(`    Byte offsets: ${mol.start_byte}-${mol.end_byte}`);
        
        const fullBodyBuffer = Buffer.from(res2.compound.compound_body, 'utf8');
        const slicedBuffer = fullBodyBuffer.subarray(mol.start_byte, mol.end_byte);
        const slicedContent = slicedBuffer.toString('utf8');
        
        assert.strictEqual(slicedContent, mol.content, 
            `Buffer slice mismatch for Chinese! Expected "${mol.content}" but got "${slicedContent}"`);
        console.log('    ✅ Byte offset extraction matches!');
    }

    // Test Case 3: Mixed ASCII and non-ASCII
    console.log('\nTest 3: Mixed ASCII and Non-ASCII');
    const mixedContent = "ASCII text with émojis 😊 and Chinese 中文.";
    const res3 = await atomizer.atomize(mixedContent, 'test_mixed.md', 'internal');
    
    console.log(`Content: "${mixedContent}"`);
    console.log(`String length: ${mixedContent.length}`);
    console.log(`Byte length: ${Buffer.byteLength(mixedContent, 'utf8')}`);
    console.log(`Molecules found: ${res3.molecules.length}`);
    
    for (const mol of res3.molecules) {
        const fullBodyBuffer = Buffer.from(res3.compound.compound_body, 'utf8');
        const slicedBuffer = fullBodyBuffer.subarray(mol.start_byte, mol.end_byte);
        const slicedContent = slicedBuffer.toString('utf8');
        
        assert.strictEqual(slicedContent, mol.content, 
            `Buffer slice mismatch for mixed content! Expected "${mol.content}" but got "${slicedContent}"`);
        console.log(`  ✅ "${mol.content}" - Byte offset extraction matches!`);
    }

    // Test Case 4: Code with non-ASCII comments
    console.log('\nTest 4: Code with Non-ASCII Comments');
    const codeContent = `function hello() {
    // This is a comment with émojis 🎉
    console.log("Hello 世界");
}`;
    const res4 = await atomizer.atomize(codeContent, 'test_code.js', 'internal');
    
    console.log(`Content: "${codeContent}"`);
    console.log(`Molecules found: ${res4.molecules.length}`);
    
    for (const mol of res4.molecules) {
        const fullBodyBuffer = Buffer.from(res4.compound.compound_body, 'utf8');
        const slicedBuffer = fullBodyBuffer.subarray(mol.start_byte, mol.end_byte);
        const slicedContent = slicedBuffer.toString('utf8');
        
        // Allow for trailing newline differences (normalize both sides)
        const normalizedSliced = slicedContent.trimEnd();
        const normalizedMol = mol.content.trimEnd();
        
        assert.strictEqual(normalizedSliced, normalizedMol, 
            `Buffer slice mismatch for code! Expected "${mol.content}" but got "${slicedContent}"`);
        console.log(`  ✅ Code molecule - Byte offset extraction matches!`);
    }

    console.log('\n🎉 All Byte Offset Tests Passed!');
}

// Run the test
testByteOffsets().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
