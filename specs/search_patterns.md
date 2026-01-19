# Search Patterns & Query Syntax for ECE

## What Happened?
The system needed a standardized approach for search queries to ensure consistent behavior across all search operations. This document defines the search patterns, query syntax, and optimization strategies for the ECE system.

## The Cost
- Inconsistent search behavior across different components
- Users experiencing different search results depending on which interface they used
- Difficulty in optimizing search queries for performance
- Lack of clear guidance on how to structure search queries for best results

## The Rule
1. **Standardized Query Structure:** All search queries should follow the same basic structure:
   - Simple keyword search: Just enter the keywords you're looking for
   - Bucket filtering: Use `bucket:name` to filter results by bucket
   - Phrase matching: Use `"exact phrase"` to match exact phrases
   - Complex queries: Combine keywords, buckets, and phrases as needed

2. **Search Optimization Strategies:**
   - **Broad Strategy:** For concept exploration and general information retrieval
   - **Precise Strategy:** For specific information and exact matches
   - **Hybrid Strategy:** For complex queries that need both concepts and specifics

3. **Bucket-Based Organization:**
   - Use buckets to organize and filter search results
   - Common buckets include: `core`, `development`, `research`, `personal`, `codebase`
   - Create new buckets as needed for specific contexts or projects

4. **Character Limit Considerations:**
   - Default character limit for search results is 5000 characters
   - This can be adjusted based on the specific needs of the search
   - Larger limits may impact performance but provide more context

5. **Semantic Intent Translation:**
   - The system will automatically translate natural language queries to optimized search parameters
   - This includes identifying relevant buckets and search strategies
   - Users can override automatic classification if needed