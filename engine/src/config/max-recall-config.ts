/**
 * Maximum Recall Configuration for STAR Algorithm
 * 
 * Optimized for retrieving the maximum relevant context with minimal filtering.
 * Use this for important sessions where you need comprehensive memory retrieval.
 * 
 * Key Principles:
 * - No temporal bias: Old memories weighted equally to new ones
 * - Deep graph traversal: 3 hops to find indirect associations
 * - Zero relevance filtering: Let the budget truncate, not the threshold
 * - High serendipity: Temperature-scaled sampling for surprising connections
 * 
 * Usage:
 *   import { MAX_RECALL_CONFIG } from './config/max-recall-config.js';
 *   const result = await executeSearch(query, buckets, MAX_RECALL_CONFIG.max_chars, ...);
 */

export const MAX_RECALL_CONFIG = {
  // Context Budget (256K chars = ~64K tokens max)
  max_chars_default: 262144,
  
  // Physics Tag-Walker Parameters
  walker: {
    planet_budget: 0.7,        // 70% direct FTS/SimHash hits
    moon_budget: 0.3,          // 30% graph-discovered associations
    max_hops: 3,               // Walk 3 steps through graph (finds indirect relations)
    temporal_decay: 0.0,       // DISABLED: All memories equally important regardless of age
    damping: 1.0,              // ZERO loss on multi-hop propagation
    min_relevance: 0.0,        // Include everything, let budget truncate naturally
    temperature: 0.8,          // High serendipity (0.0 = deterministic, 1.0 = maximum random)
    gravity_threshold: 0.0,    // No minimum gravity score - include weak connections
    max_per_hop: 200,          // Expand aggressively: 200 nodes per hop
    walk_radius: 3             // Full 3-hop radial inflation
  },
  
  // Query Expansion
  expansion: {
    use_synonyms: true,                    // Enable synonym ring expansion
    max_synonyms_per_term: 10,             // Get up to 10 synonyms per term
    use_semantic_expansion: true,          // Use @rbalchii/dse semantic expansion
    use_query_splitting: true,             // Split complex queries into molecules
    use_enhanced_tag_walker: true          // Always use enhanced tag-walker
  },
  
  // Context Assembly
  context: {
    include_provenance: true,              // Include source metadata for each result
    include_temporal_weight: true,         // Show temporal weight (will be 1.0 for all with decay=0)
    include_simhash_distance: true,        // Show content similarity scores
    include_association_path: true,        // Show which tags connected to query
    deduplicate_by_simhash: true,          // Remove near-duplicates (hamming < 5)
    sort_by: 'gravity' as const            // Sort by gravity score (comprehensive weighting)
  }
};

/**
 * Quick comparison with default config
 */
export const DEFAULT_COMPARISON = {
  parameter: ['temporal_decay', 'damping', 'max_hops', 'min_relevance', 'temperature', 'max_per_hop'],
  default:   [0.00001,     0.85,     1,        0.3,            0.2,         50],
  maxRecall: [0.0,        1.0,      3,        0.0,            0.8,         200]
};

/**
 * Get config for specific use case
 */
export function getRecallConfig(mode: 'maximum' | 'balanced' | 'focused') {
  if (mode === 'maximum') {
    return MAX_RECALL_CONFIG;
  }
  
  if (mode === 'focused') {
    // Focused: Narrow retrieval with high precision
    return {
      max_chars_default: 32768, // 32K chars
      walker: {
        planet_budget: 0.9,
        moon_budget: 0.1,
        max_hops: 1,
        temporal_decay: 0.0001,
        damping: 0.7,
        min_relevance: 0.5,
        temperature: 0.1,
        gravity_threshold: 0.5,
        max_per_hop: 20,
        walk_radius: 1
      }
    };
  }
  
  // Balanced: Default production config
  return {
    max_chars_default: 131072, // 128K chars
    walker: {
      planet_budget: 0.7,
      moon_budget: 0.3,
      max_hops: 2,
      temporal_decay: 0.00001,
      damping: 0.85,
      min_relevance: 0.1,
      temperature: 0.2,
      gravity_threshold: 0.01,
      max_per_hop: 50,
      walk_radius: 1
    }
  };
}
