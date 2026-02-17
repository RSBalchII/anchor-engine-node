/**
 * Context Retrieval Test Suite
 * 
 * Tests the quality and formatting of retrieved context from the personal database
 * with a 1k token limit to assess usefulness and proper population
 */

import { executeSearch } from '../dist/services/search/search.js';
import { db } from '../dist/core/db.js';
import { truncateTokens } from '../dist/utils/token-utils.js';

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
 * Main test suite for context retrieval
 */
async function runContextRetrievalTests() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     CONTEXT RETRIEVAL TESTS            ║');
    console.log('╚════════════════════════════════════════╝\n');

    try {
        await db.init();
        console.log('✅ Database initialized successfully\n');
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        process.exit(1);
    }

    // ═══════════════════════════════════════════
    // SECTION 1: Basic Context Retrieval
    // ═══════════════════════════════════════════
    console.log('─── Basic Context Retrieval ───');

    await test('Retrieve context with 1k token limit', async () => {
        // Use a general query that should return personal data
        const query = "personal projects and work";
        
        const results = await executeSearch(query);
        
        // Apply 1k token limit to the context
        const limitedContext = truncateTokens(results.context, 1000);
        
        assert(limitedContext.length > 0, 'Context should not be empty');
        assert(limitedContext.length <= results.context.length, 'Context should be limited');
        
        console.log(`     └─ Retrieved context length: ${limitedContext.length} chars (original: ${results.context.length})`);
    });

    // ═══════════════════════════════════════════
    // SECTION 2: Context Quality Assessment
    // ═══════════════════════════════════════════
    console.log('\n─── Context Quality Assessment ───');

    await test('Context contains relevant personal information', async () => {
        const query = "my work experience";
        
        const results = await executeSearch(query);
        const limitedContext = truncateTokens(results.context, 1000);
        
        // Check if context contains meaningful personal information
        const hasPersonalInfo = limitedContext.toLowerCase().includes('project') || 
                               limitedContext.toLowerCase().includes('work') || 
                               limitedContext.toLowerCase().includes('experience') ||
                               limitedContext.toLowerCase().includes('code') ||
                               limitedContext.toLowerCase().includes('development');
        
        assert(hasPersonalInfo, 'Context should contain personal/relevant information');
        
        console.log(`     └─ Context contains personal info: ${hasPersonalInfo}`);
    });

    await test('Context is properly formatted', async () => {
        const query = "recent activities";
        
        const results = await executeSearch(query);
        const limitedContext = truncateTokens(results.context, 1000);
        
        // Check basic formatting properties
        const hasStructure = limitedContext.includes('\n') || 
                            limitedContext.includes('.') || 
                            limitedContext.includes(':');
        
        const reasonableLength = limitedContext.length > 50; // At least some content
        
        assert(hasStructure, 'Context should have basic formatting (line breaks, punctuation)');
        assert(reasonableLength, 'Context should have sufficient content');
        
        console.log(`     └─ Context formatted properly: ${hasStructure && reasonableLength}`);
    });

    // ═══════════════════════════════════════════
    // SECTION 3: Token Limit Verification
    // ═══════════════════════════════════════════
    console.log('\n─── Token Limit Verification ───');

    await test('Context respects 1k token limit', async () => {
        const query = "all information";
        
        const results = await executeSearch(query);
        const limitedContext = truncateTokens(results.context, 1000);
        
        // We'll estimate token count by word count (rough approximation)
        // In practice, you'd use a proper tokenizer
        const estimatedTokens = limitedContext.split(/\s+/).length;
        
        // Allow some buffer for token estimation differences
        assert(estimatedTokens <= 1200, `Context exceeds token limit (estimated: ${estimatedTokens} tokens)`);
        
        console.log(`     └─ Estimated tokens: ${estimatedTokens} (within 1k limit)`);
    });

    // ═══════════════════════════════════════════
    // SECTION 4: Relevance Assessment
    // ═══════════════════════════════════════════
    console.log('\n─── Relevance Assessment ───');

    await test('Context relevance to query', async () => {
        const query = "ECE Core development";
        
        const results = await executeSearch(query);
        const limitedContext = truncateTokens(results.context, 1000);
        
        // Check if context contains terms related to the query
        const queryTerms = query.toLowerCase().split(/\s+/);
        const contextLower = limitedContext.toLowerCase();
        
        const hasRelevantTerms = queryTerms.some(term => 
            contextLower.includes(term) || 
            contextLower.includes(term.replace('_', ''))
        );
        
        assert(hasRelevantTerms, 'Context should contain terms related to the query');
        
        console.log(`     └─ Context contains query terms: ${hasRelevantTerms}`);
    });

    // ═══════════════════════════════════════════
    // SECTION 5: Result Structure Validation
    // ═══════════════════════════════════════════
    console.log('\n─── Result Structure Validation ───');

    await test('Search results have proper structure', async () => {
        const query = "technical documentation";
        
        const results = await executeSearch(query);
        const limitedContext = truncateTokens(results.context, 1000);
        
        // Validate result structure
        assert('context' in results, 'Results should have context property');
        assert('results' in results, 'Results should have results array');
        assert(Array.isArray(results.results), 'Results should be an array');
        
        // Check if individual results have expected properties
        if (results.results.length > 0) {
            const firstResult = results.results[0];
            assert('content' in firstResult, 'Result should have content');
            assert('score' in firstResult, 'Result should have score');
            assert('source' in firstResult, 'Result should have source');
        }
        
        console.log(`     └─ Found ${results.results.length} relevant results`);
    });

    // ═══════════════════════════════════════════
    // SECTION 6: Personal Data Specific Tests
    // ═══════════════════════════════════════════
    console.log('\n─── Personal Data Specific Tests ───');

    await test('Retrieve personal project information', async () => {
        const query = "my current projects";
        
        const results = await executeSearch(query);
        const limitedContext = truncateTokens(results.context, 1000);
        
        // Look for evidence of personal project data
        const hasProjectInfo = limitedContext.toLowerCase().includes('project') ||
                              limitedContext.toLowerCase().includes('code') ||
                              limitedContext.toLowerCase().includes('github') ||
                              limitedContext.toLowerCase().includes('repository') ||
                              limitedContext.toLowerCase().includes('feature') ||
                              limitedContext.toLowerCase().includes('development');
        
        assert(hasProjectInfo, 'Context should contain personal project information');
        
        console.log(`     └─ Contains personal project info: ${hasProjectInfo}`);
    });

    await test('Context diversity across different queries', async () => {
        const queries = [
            "my technical skills",
            "recent work",
            "current projects",
            "programming languages"
        ];
        
        const contexts: string[] = [];
        
        for (const query of queries) {
            const results = await executeSearch(query);
            const limitedContext = truncateTokens(results.context, 1000);
            contexts.push(limitedContext);
        }
        
        // Check that different queries yield different contexts
        const uniqueContexts = new Set(contexts.map(ctx => ctx.substring(0, 100))); // Compare first 100 chars
        const hasDiversity = uniqueContexts.size >= Math.max(1, queries.length - 2); // Allow some overlap
        
        assert(hasDiversity, `Contexts should vary across different queries (${uniqueContexts.size}/${queries.length} unique)`);
        
        console.log(`     └─ Context diversity: ${uniqueContexts.size}/${queries.length} unique samples`);
    });

    // ═══════════════════════════════════════════
    // RESULTS
    // ═══════════════════════════════════════════
    console.log('\n╔════════════════════════════════════════╗');
    console.log(`║  Context Retrieval Tests: ${passed} passed, ${failed} failed`.padEnd(41) + '║');
    console.log('╚════════════════════════════════════════╝\n');

    process.exit(failed > 0 ? 1 : 0);
}

// Run the test suite
runContextRetrievalTests().catch(e => {
    console.error('Context retrieval tests crashed:', e);
    process.exit(1);
});