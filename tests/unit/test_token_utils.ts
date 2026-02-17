/**
 * Simple Token Utility Test
 * 
 * Tests the token utility functions we created
 */

import { truncateTokens, estimateTokenCount } from '../dist/utils/token-utils.js';

// Test results tracking
let passed = 0;
let failed = 0;

/**
 * Test runner with pretty output
 */
async function test(name: string, fn: () => Promise<void>) {
    try {
        process.stdout.write(`  ${name}... `);
        await fn();
        console.log('✅ PASS');
        passed++;
    } catch (e: any) {
        console.log('❌ FAIL');
        console.error(`     └─ ${e.message}`);
        failed++;
    }
}

/**
 * Assert helper
 */
function assert(condition: boolean, message?: string) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

/**
 * Main test suite for token utilities
 */
async function runTokenUtilityTests() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     TOKEN UTILITY TESTS                ║');
    console.log('╚════════════════════════════════════════╝\n');

    // ═══════════════════════════════════════════
    // SECTION 1: Token Count Estimation
    // ═══════════════════════════════════════════
    console.log('─── Token Count Estimation ───');

    await test('Basic token count estimation', async () => {
        const text = "This is a simple test sentence.";
        const count = estimateTokenCount(text);
        
        assert(count > 0, 'Token count should be positive');
        assert(count <= text.split(/\s+/).length, 'Token count should be reasonable');
        
        console.log(`     └─ Token count for "${text}": ${count}`);
    });

    await test('Empty string token count', async () => {
        const count = estimateTokenCount('');
        assert(count === 0, 'Empty string should have 0 tokens');
    });

    // ═══════════════════════════════════════════
    // SECTION 2: Token Truncation
    // ═══════════════════════════════════════════
    console.log('\n─── Token Truncation ───');

    await test('Truncate to 10 tokens', async () => {
        const text = "This is a longer text with many words that should be truncated properly. " +
                    "We need to ensure the truncation works as expected. " +
                    "Each word should count as approximately one token. " +
                    "The result should be shorter than the original. " +
                    "Let's add a few more sentences to make sure we have enough content. " +
                    "This will help us verify that the truncation is working correctly. " +
                    "We want to make sure the function handles various text lengths. " +
                    "The final result should be predictable and consistent. " +
                    "This concludes our test content for this particular test case.";

        const truncated = truncateTokens(text, 10);
        const truncatedCount = estimateTokenCount(truncated);
        
        assert(truncatedCount <= 10, `Truncated text should have <= 10 tokens, got ${truncatedCount}`);
        assert(truncated.length < text.length, 'Truncated text should be shorter than original');
        
        console.log(`     └─ Original: ~${estimateTokenCount(text)} tokens, Truncated: ${truncatedCount} tokens`);
    });

    await test('Truncate to 0 tokens', async () => {
        const text = "This text should be completely truncated.";
        const truncated = truncateTokens(text, 0);
        
        assert(truncated === '', 'Text truncated to 0 tokens should be empty');
    });

    await test('Truncate to more tokens than text has', async () => {
        const text = "Short text";
        const truncated = truncateTokens(text, 100);
        
        assert(truncated === text, 'Text should remain unchanged when limit exceeds token count');
    });

    // ═══════════════════════════════════════════
    // RESULTS
    // ═══════════════════════════════════════════
    console.log('\n╔════════════════════════════════════════╗');
    console.log(`║  Token Utility Tests: ${passed} passed, ${failed} failed`.padEnd(41) + '║');
    console.log('╚════════════════════════════════════════╝\n');

    process.exit(failed > 0 ? 1 : 0);
}

// Run the test suite
runTokenUtilityTests().catch(e => {
    console.error('Token utility tests crashed:', e);
    process.exit(1);
});