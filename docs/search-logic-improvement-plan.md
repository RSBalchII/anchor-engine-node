# Search Logic Improvement Plan for ECE_Core

## Problem Statement

The Tag-Walker protocol shows brittleness in natural language query processing:
- Query "What is the latest state of the ECE" returned 0 results
- Fallback query "state ECE" returned 42 relevant results
- NLP parser over-optimizes or filters are too strict
- System relies on fallback strategies instead of primary semantic matching

## Root Cause Analysis

### 1. Query Intent Mapping Issue
The system fails to map natural language intent to semantic categories effectively.

### 2. Overly Restrictive Filtering
First-pass filtering eliminates potentially relevant results too aggressively.

### 3. Semantic Category Matching
The system doesn't properly recognize semantic relationships in conversational queries.

## Implementation Plan

### Phase 1: Immediate Fixes (Week 1)

#### 1.1 Relax First-Pass Filtering
**File**: `engine/src/services/search/tag-walker.ts`

```typescript
// Current implementation may be too restrictive
const strictFilters = {
  minRelevance: 0.8,  // TOO HIGH
  bucketMatchRequired: true,  // TOO RESTRICTIVE
  tagMatchThreshold: 0.9    // TOO HIGH
};

// Updated implementation
const relaxedFilters = {
  minRelevance: 0.3,  // MORE PERMISSIVE
  bucketMatchRequired: false,  // ALLOW FLEXIBILITY
  tagMatchThreshold: 0.5    // MORE INCLUSIVE
};
```

#### 1.2 Enhance Natural Language Processing
**File**: `engine/src/services/nlp/query-parser.ts`

```typescript
// Add conversational query expansion
function expandConversationalQuery(query: string): string[] {
  const expansions: string[] = [];

  // Common conversational patterns
  const patterns = [
    { pattern: /what is the (latest|current|recent) (.+)/i, expansion: "$2" },
    { pattern: /tell me about (.+)/i, expansion: "$1" },
    { pattern: /how is (.+) doing/i, expansion: "$1" },
    { pattern: /what's happening with (.+)/i, expansion: "$1" }
  ];

  for (const p of patterns) {
    const match = query.match(p.pattern);
    if (match) {
      expansions.push(query.replace(p.pattern, p.expansion));
    }
  }

  return expansions;
}
```

#### 1.3 Improve Query Confidence Scoring
**File**: `engine/src/services/search/search-service.ts`

```typescript
// Add confidence-based fallback mechanism
interface QueryResult {
  content: string;
  score: number;
  confidence: number;  // NEW FIELD
  strategy: string;
}

function executeSearch(query: string): QueryResult[] {
  // Primary search with relaxed filters
  const primaryResults = executeTagWalkerSearch(query, {
    strictness: 'relaxed',
    minConfidence: 0.3  // LOWER THRESHOLD
  });

  // If primary search yields insufficient results, try expansions
  if (primaryResults.length < 3) {
    const expandedQueries = expandConversationalQuery(query);
    for (const expQuery of expandedQueries) {
      const expansionResults = executeTagWalkerSearch(expQuery, {
        strictness: 'balanced',
        minConfidence: 0.5
      });
      primaryResults.push(...expansionResults);
    }
  }

  return primaryResults;
}
```

### Phase 2: Semantic Enhancement (Week 2)

#### 2.1 Entity Co-occurrence Detection Improvement
**File**: `engine/src/services/semantic/entity-cooccurrence.ts`

```typescript
// Enhanced entity co-occurrence detection
class EntityCooccurrenceDetector {
  detectRelationships(content: string, entities: string[]): SemanticRelationship[] {
    const relationships: SemanticRelationship[] = [];

    // Look for relationship indicators between entities
    const relationshipIndicators = [
      'and', 'with', 'met', 'told', 'said', 'visited', 'called',
      'texted', 'about', 'relationship', 'connection', 'interaction'
    ];

    // Enhanced detection logic
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];

        // Check for relationship indicators between entities
        const pattern = new RegExp(`${entity1}[^.!?]{0,100}${relationshipIndicators.join('|')}[^.!?]{0,100}${entity2}|${entity2}[^.!?]{0,100}${relationshipIndicators.join('|')}[^.!?]{0,100}${entity1}`, 'gi');

        if (content.match(pattern)) {
          relationships.push({
            entity1,
            entity2,
            type: 'relationship',
            strength: 0.8
          });
        }
      }
    }

    return relationships;
  }
}
```

#### 2.2 Semantic Category Mapping
**File**: `engine/src/services/semantic/category-mapper.ts`

```typescript
// Enhanced semantic category mapping
class SemanticCategoryMapper {
  mapQueryToCategories(query: string): SemanticCategory[] {
    const categories: SemanticCategory[] = [];

    // Enhanced mapping logic
    if (this.containsSemanticIndicators(query, ['state', 'status', 'current', 'latest', 'recent'])) {
      categories.push(SemanticCategory.STATUS);
    }

    if (this.containsSemanticIndicators(query, ['relationship', 'connection', 'interaction', 'with', 'and'])) {
      categories.push(SemanticCategory.RELATIONSHIP);
    }

    if (this.containsSemanticIndicators(query, ['technical', 'code', 'architecture', 'system', 'implementation'])) {
      categories.push(SemanticCategory.TECHNICAL);
    }

    // Add context-specific mappings
    if (query.toLowerCase().includes('ece') || query.toLowerCase().includes('engine')) {
      categories.push(SemanticCategory.PROJECT);
    }

    return categories;
  }

  private containsSemanticIndicators(text: string, indicators: string[]): boolean {
    const lowerText = text.toLowerCase();
    return indicators.some(indicator => lowerText.includes(indicator));
  }
}
```

### Phase 3: Adaptive Filtering (Week 3)

#### 3.1 Query-Type Adaptive Filtering
**File**: `engine/src/services/search/adaptative-filter.ts`

```typescript
// Adaptive filtering based on query type
class AdaptiveFilter {
  applyFilter(query: string, results: SearchMolecule[], queryType: QueryType): SearchMolecule[] {
    switch (queryType) {
      case 'conversational':
        // More permissive for conversational queries
        return results.filter(r => r.score >= 0.2);

      case 'precise':
        // More restrictive for precise queries
        return results.filter(r => r.score >= 0.7);

      case 'exploratory':
        // Medium restrictiveness for exploratory queries
        return results.filter(r => r.score >= 0.4);

      default:
        // Default to balanced filtering
        return results.filter(r => r.score >= 0.5);
    }
  }

  classifyQueryType(query: string): QueryType {
    // Classify based on linguistic patterns
    if (query.toLowerCase().startsWith('what') ||
        query.toLowerCase().startsWith('how') ||
        query.toLowerCase().startsWith('tell me')) {
      return 'conversational';
    }

    if (query.split(' ').length <= 3) {
      return 'precise';
    }

    return 'exploratory';
  }
}
```

### Phase 4: Monitoring and Feedback (Week 4)

#### 4.1 Query Success Rate Tracking
**File**: `engine/src/services/monitoring/query-analytics.ts`

```typescript
// Query analytics for continuous improvement
class QueryAnalytics {
  private successRateTracker: Map<string, { successes: number, failures: number }> = new Map();

  recordQueryOutcome(query: string, resultsCount: number, strategy: string): void {
    const key = `${strategy}_${query.substring(0, 20)}`;
    const stats = this.successRateTracker.get(key) || { successes: 0, failures: 0 };

    if (resultsCount > 0) {
      stats.successes++;
    } else {
      stats.failures++;
    }

    this.successRateTracker.set(key, stats);
  }

  getSuccessRates(): Map<string, number> {
    const rates = new Map<string, number>();

    for (const [key, stats] of this.successRateTracker.entries()) {
      const total = stats.successes + stats.failures;
      if (total > 0) {
        rates.set(key, stats.successes / total);
      }
    }

    return rates;
  }
}
```

## Implementation Timeline

### Week 1: Immediate Fixes
- [ ] Relax first-pass filtering parameters
- [ ] Implement conversational query expansion
- [ ] Add confidence-based fallback mechanism
- [ ] Test with sample queries including "What is the latest state of the ECE"

### Week 2: Semantic Enhancement
- [ ] Improve entity co-occurrence detection
- [ ] Enhance semantic category mapping
- [ ] Test relationship narrative discovery
- [ ] Validate with diverse query types

### Week 3: Adaptive Filtering
- [ ] Implement query-type classification
- [ ] Apply adaptive filtering based on query type
- [ ] Fine-tune thresholds for different query types
- [ ] Test performance impact

### Week 4: Monitoring and Optimization
- [ ] Deploy query analytics
- [ ] Monitor success rates
- [ ] Iterate based on real-world usage
- [ ] Document improvements

## Success Metrics

### Primary Metrics
- **Query Success Rate**: Increase from current rate to >95%
- **Zero-Result Queries**: Reduce to <2% of total queries
- **Fallback Usage**: Reduce reliance on fallback strategies by 50%

### Secondary Metrics
- **Response Time**: Maintain <100ms average response time
- **Precision/Recall Balance**: Optimize for user satisfaction
- **User Engagement**: Track query frequency and session duration

## Rollout Strategy

### Phase 1: Internal Testing
- Deploy changes to development environment
- Run comprehensive test suite
- Validate with sample queries including the problematic "What is the latest state of the ECE"

### Phase 2: Staged Rollout
- Deploy to subset of users
- Monitor query analytics
- Collect feedback on search quality

### Phase 3: Full Deployment
- Deploy to all users
- Monitor system-wide metrics
- Continue optimization based on usage patterns

## Risk Mitigation

### Performance Risks
- Monitor system performance during rollout
- Maintain performance benchmarks
- Rollback plan if performance degrades

### Quality Risks
- Implement A/B testing for search quality
- Monitor user feedback
- Maintain fallback mechanisms during transition

This plan addresses the specific issue where natural language queries fail to return results despite relevant content existing in the system. The improvements will make the search more robust while maintaining the high performance achieved through the native module optimizations.