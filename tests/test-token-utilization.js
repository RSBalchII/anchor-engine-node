/**
 * Test script to verify the enhanced search functionality with full token budget utilization
 */

import { executeSearch } from './dist/services/search/search.js';

async function testTokenBudgetUtilization() {
  console.log('Testing token budget utilization...');

  try {
    // Test with different token budgets to ensure the system properly utilizes the full budget
    const testCases = [
      { budget: 8000, description: '8k token budget' },
      { budget: 10000, description: '10k token budget' },
      { budget: 12000, description: '12k token budget' }
    ];

    for (const testCase of testCases) {
      console.log(`\n--- Testing ${testCase.description} ---`);
      
      const startTime = Date.now();
      
      // Execute a search with the specified budget
      const result = await executeSearch(
        "system design patterns",  // Generic query to get varied results
        undefined,                 // bucket
        [],                        // buckets
        testCase.budget,           // maxChars (token budget * 4)
        false,                     // deep
        'all',                     // provenance
        []                         // tags
      );
      
      const elapsed = Date.now() - startTime;
      const charCount = result.context.length;
      
      console.log(`Results: ${result.results.length} items`);
      console.log(`Character count: ${charCount}`);
      console.log(`Target budget: ${testCase.budget} chars`);
      console.log(`Utilization: ${((charCount / testCase.budget) * 100).toFixed(2)}%`);
      console.log(`Time taken: ${elapsed}ms`);
      
      // Verify that we're getting close to the budget (within 80% should be achievable)
      if (charCount < testCase.budget * 0.8) {
        console.log(`⚠️  WARNING: Budget utilization low (${((charCount / testCase.budget) * 100).toFixed(2)}%)`);
      } else {
        console.log(`✅ Good budget utilization`);
      }
    }

    console.log('\n--- Test completed successfully ---');
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
testTokenBudgetUtilization();