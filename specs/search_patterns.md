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

## Updated Search Patterns (Standard 104: Universal Semantic Search)

**Note:** This section reflects the implementation details defined in [Standard 104](../standards/104-universal-semantic-search.md).

### 1. Semantic Category Queries
With the introduction of semantic categories, queries can now target specific semantic types:

- `#Relationship`: Search for relationship-related content
- `#Narrative`: Search for story/timeline content
- `#Technical`: Search for technical documentation
- `#Industry`: Search for industry-specific content
- `#Location`: Search for location-based content
- `#Emotional`: Search for emotional content
- `#Temporal`: Search for time-based content
- `#Causal`: Search for cause-effect relationships

### 2. Entity Co-occurrence Queries
The system now recognizes when multiple entities appear together:

- `"Rob and Jade"`: Will prioritize relationship-focused content
- `"Rob timeline"`: Will prioritize narrative-focused content
- `"Rob code"`: Will prioritize technical-focused content

### 3. Tag-Walker Protocol Implementation
The search now follows the Tag-Walker protocol with 70/30 split:

- **70% Anchors**: Direct keyword matches via FTS
- **30% Walkers**: Associative neighbors via graph traversal

### 4. Enhanced Chronological Sorting (Standard 096)
The system now implements context-aware timestamp assignment following Standard 096:

- **Content-specific timestamps**: Extract temporal markers from content (ISO dates, US dates, Month-Day formats)
- **File modification inheritance**: Use source file modification time as fallback
- **Temporal diversity**: Show varied timestamps reflecting actual content timeline
- **Chronological queries**: Proper handling of temporal range queries like "from 2025 to 2026"

### 4. Provenance-Aware Queries
The system applies different weights based on content provenance:

- **Internal (Sovereign)**: 2-3x boost in relevance
- **External**: Supporting evidence only
- **Quarantine**: Isolated content (requires explicit access)

### 5. Context-Aware Search
The system now maintains context through the Bright Node Protocol:

- **Focused Queries**: Targeted retrieval for specific information
- **Exploratory Queries**: Broader retrieval for concept exploration
- **Relationship Queries**: Special handling for entity relationship discovery

## Query Syntax Examples

### Basic Queries
- `search "Rob"` - Find all content mentioning "Rob"
- `search "Rob" bucket:personal` - Find "Rob" in personal bucket only
- `search "burnout recovery"` - Find content about burnout recovery

### Semantic Category Queries
- `search #Relationship` - Find relationship-focused content
- `search "Rob" #Narrative` - Find narrative content about Rob
- `search "algorithm" #Technical` - Find technical content about algorithms

### Advanced Queries
- `search "Rob and Jade"` - Find content about both entities
- `search "timeline" #Temporal` - Find chronological content
- `search "problem solution" #Causal` - Find cause-effect relationships

## Performance Optimization

### 1. Dynamic Atom Scaling
The system automatically adjusts the number of results based on query complexity:
- **Simple queries**: Fewer, more relevant results
- **Complex queries**: More results to ensure coverage
- **Multi-entity queries**: Split and merge strategy for comprehensive coverage

### 2. Context Budget Management
- **70% Precision**: Direct matches for accuracy
- **30% Discovery**: Associative matches for serendipity
- **Adaptive limits**: Adjust based on query complexity and user preferences

### 3. Deduplication and Merging
- **SimHash-based deduplication**: Prevents duplicate content
- **Semantic merging**: Combines related content intelligently
- **Active cleansing**: Maintains high signal-to-noise ratio