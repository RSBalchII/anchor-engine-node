# Context Assembly Findings & Optimization Report

## What Happened?
During development and testing of the context assembly system, several important findings emerged regarding how context is retrieved, assembled, and presented to the LLM. This document captures the key findings and optimizations discovered during the process.

## The Cost
- Initial context assembly was inefficient and slow
- Poor relevance ranking in search results
- Memory budget management issues
- Inconsistent context presentation across different query types

## The Rule
1. **The 70/30 Split:** When assembling context, allocate 70% of the character budget to Direct Matches (Keyword/Vector) and 30% to Associative Matches (Shared Tags).

2. **Tag Harvesting:** Extract semantic tags from the Direct Matches to find "Neighboring" memories.

3. **Unified Stream:** Present both Direct and Associative snippets in the same output stream, clearly labeled.

4. **Memory Budget Management:**
   - Set a maximum character limit for context assembly (default 5000 chars)
   - Implement progressive loading for large context requests
   - Use sliding window approach for temporal context

5. **Relevance Ranking:**
   - Use BM25 algorithm for keyword-based relevance
   - Implement semantic similarity for vector-based matching
   - Combine both approaches for hybrid search results

6. **Performance Optimization:**
   - Cache frequent queries to improve response time
   - Implement pagination for large result sets
   - Use asynchronous loading where possible

## Key Findings
- Direct matches provide the most relevant context for specific queries
- Associative matches help with concept exploration and discovery
- The combination of both approaches provides the most comprehensive context
- Character budget management is crucial for performance and cost efficiency